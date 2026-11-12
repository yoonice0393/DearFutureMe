-- Server-side helpers. Callable by the service role (Edge Functions) only.
-- Each one does its checks and writes inside one transaction, under advisory
-- locks, so concurrent submissions can't race past a limit.

-- ── Sliding-window rate limit ───────────────────────────────────────────────
-- Returns true (and records the hit) if allowed, false if over the limit.
create function public.rate_hit(p_scope text, p_key text, p_window interval, p_max integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('rate:' || p_scope || ':' || p_key, 0));
  delete from public.rate_events
   where scope = p_scope and key_hash = p_key and created_at < now() - p_window;
  select count(*) into n from public.rate_events
   where scope = p_scope and key_hash = p_key and created_at >= now() - p_window;
  if n >= p_max then
    return false;
  end if;
  insert into public.rate_events (scope, key_hash) values (p_scope, p_key);
  return true;
end $$;

-- ── Create a letter with every limit checked atomically ─────────────────────
-- Returns 'ok' or an error code the Edge Function maps to a message:
--   suppressed | email_limit | event_closed | event_cap | static_cap | kiosk_inactive
create function public.create_letter(
  p_id              uuid,
  p_user_id         uuid,
  p_email           text,
  p_email_hash      text,
  p_source          public.letter_source,
  p_kiosk_id        uuid,
  p_event_id        uuid,
  p_via_static_code boolean,
  p_ciphertext      bytea,
  p_iv              bytea,
  p_deliver_at      timestamptz,
  p_timezone        text,
  p_status          public.letter_status,
  p_consent_version text,
  p_max_per_email   integer
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  n  integer;
  ev public.events%rowtype;
begin
  if p_status not in ('sealed', 'pending_verification') then
    raise exception 'create_letter: invalid status %', p_status;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('email:' || p_email_hash, 0));

  if exists (select 1 from public.suppressed_emails where email_hash = p_email_hash) then
    return 'suppressed';
  end if;

  select count(*) into n from public.letters
   where email_hash = p_email_hash and status in ('pending_verification', 'sealed', 'sending');
  if n >= p_max_per_email then
    return 'email_limit';
  end if;

  if p_kiosk_id is not null and not exists (
    select 1 from public.kiosks where id = p_kiosk_id and active and revoked_at is null
  ) then
    return 'kiosk_inactive';
  end if;

  if p_event_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('event:' || p_event_id::text, 0));
    select * into ev from public.events where id = p_event_id;
    if not found or ev.paused or now() < ev.starts_at or now() > ev.ends_at then
      return 'event_closed';
    end if;
    select count(*) into n from public.letters
     where event_id = p_event_id and status <> 'cancelled';
    if n >= ev.submission_cap then
      return 'event_cap';
    end if;
    if p_via_static_code then
      select count(*) into n from public.letters
       where event_id = p_event_id and via_static_code and status <> 'cancelled';
      if n >= ev.static_code_cap then
        return 'static_cap';
      end if;
    end if;
  end if;

  insert into public.letters (
    id, user_id, recipient_email, email_hash, kiosk_id, event_id, source, via_static_code,
    body_ciphertext, body_iv, deliver_at, timezone, status, consent_version, consent_at
  ) values (
    p_id, p_user_id, lower(p_email), p_email_hash, p_kiosk_id, p_event_id, p_source, p_via_static_code,
    p_ciphertext, p_iv, p_deliver_at, p_timezone, p_status, p_consent_version, now()
  );

  if p_user_id is not null then
    update public.profiles
       set consent_version = p_consent_version, consent_at = now()
     where id = p_user_id;
  end if;

  return 'ok';
end $$;

-- ── Events and kiosks ───────────────────────────────────────────────────────

-- Run from the SQL editor (as postgres) to set up an event:
--   select public.create_event('Campus Fair 2026', 'campus-fair-2026',
--     '2026-11-20 08:00+08', '2026-11-22 20:00+08', '482913', 300);
create function public.create_event(
  p_name text, p_slug text, p_starts timestamptz, p_ends timestamptz,
  p_staff_pin text, p_cap integer default 300, p_static_cap integer default 100
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid;
begin
  if p_staff_pin !~ '^[0-9]{6,12}$' then
    raise exception 'Staff PIN must be 6 to 12 digits';
  end if;
  insert into public.events (name, slug, starts_at, ends_at, submission_cap, static_code_cap, staff_pin_hash)
  values (p_name, lower(p_slug), p_starts, p_ends, p_cap, p_static_cap,
          extensions.crypt(p_staff_pin, extensions.gen_salt('bf', 10)))
  returning id into new_id;
  return new_id;
end $$;

-- Change an event's staff PIN.
create function public.set_event_pin(p_slug text, p_staff_pin text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_staff_pin !~ '^[0-9]{6,12}$' then
    raise exception 'Staff PIN must be 6 to 12 digits';
  end if;
  update public.events
     set staff_pin_hash = extensions.crypt(p_staff_pin, extensions.gen_salt('bf', 10))
   where slug = lower(p_slug);
end $$;

-- Returns the event id if slug + PIN match an event that hasn't ended, else null.
-- The Edge Function rate-limits attempts before calling this.
create function public.verify_staff_pin(p_slug text, p_pin text) returns uuid
language sql security definer set search_path = '' stable as $$
  select id from public.events
   where slug = lower(p_slug)
     and ends_at > now()
     and staff_pin_hash = extensions.crypt(p_pin, staff_pin_hash);
$$;

-- Everything the booth needs to know about a kiosk token, in one call.
create function public.kiosk_lookup(p_token_hash text)
returns table (
  kiosk_id uuid, event_id uuid, event_name text, allowed_presets integer[],
  starts_at timestamptz, ends_at timestamptz, paused boolean, usable boolean
)
language sql security definer set search_path = '' stable as $$
  select k.id, e.id, e.name, e.allowed_presets, e.starts_at, e.ends_at, e.paused,
         (k.active and k.revoked_at is null) as usable
    from public.kiosks k
    join public.events e on e.id = k.event_id
   where k.token_hash = p_token_hash;
$$;

-- Staff tools: revoke a device, and cancel what it submitted.
create function public.revoke_kiosk(p_kiosk_id uuid, p_cancel_letters boolean default false)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer := 0;
begin
  update public.kiosks set active = false, revoked_at = now() where id = p_kiosk_id;
  if p_cancel_letters then
    update public.letters
       set status = 'cancelled', cancelled_at = now()
     where kiosk_id = p_kiosk_id and status in ('pending_verification', 'sealed');
    get diagnostics n = row_count;
  end if;
  return n;
end $$;

-- Lock all of the above to the service role (and postgres via the SQL editor).
revoke all on function public.rate_hit(text, text, interval, integer) from public, anon, authenticated;
revoke all on function public.create_letter(uuid, uuid, text, text, public.letter_source, uuid, uuid, boolean, bytea, bytea, timestamptz, text, public.letter_status, text, integer) from public, anon, authenticated;
revoke all on function public.create_event(text, text, timestamptz, timestamptz, text, integer, integer) from public, anon, authenticated;
revoke all on function public.set_event_pin(text, text) from public, anon, authenticated;
revoke all on function public.verify_staff_pin(text, text) from public, anon, authenticated;
revoke all on function public.kiosk_lookup(text) from public, anon, authenticated;
revoke all on function public.revoke_kiosk(uuid, boolean) from public, anon, authenticated;

grant execute on function public.rate_hit(text, text, interval, integer) to service_role;
grant execute on function public.create_letter(uuid, uuid, text, text, public.letter_source, uuid, uuid, boolean, bytea, bytea, timestamptz, text, public.letter_status, text, integer) to service_role;
grant execute on function public.verify_staff_pin(text, text) to service_role;
grant execute on function public.kiosk_lookup(text) to service_role;
grant execute on function public.revoke_kiosk(uuid, boolean) to service_role;
