-- Phase 5: email delivery.
--
-- Letters: hourly cron → dispatch function → claim_due_letters() → send → mark.
-- Receipts / verification / heartbeat: email_outbox, drained every 5 minutes
-- (and attempted immediately on submit).
--
-- "Never sent twice": Brevo has no idempotency keys, so a letter is claimed
-- (status 'sending') and a send_log 'attempt' row is written BEFORE the provider
-- call. If a send is interrupted and we can't tell whether it went out, the
-- sweeper marks it 'failed' for a human to check instead of retrying blindly.

-- Verification now uses signed, expiring link tokens; no stored tokens needed.
drop table if exists public.email_verifications;

-- ── Outbox for receipts, verification links and the admin heartbeat ─────────
create table public.email_outbox (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('receipt', 'verify', 'heartbeat')),
  letter_id       uuid references public.letters (id) on delete cascade,
  status          text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempts        integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error      text check (char_length(last_error) <= 500),
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  check (kind = 'heartbeat' or letter_id is not null)
);
create unique index email_outbox_one_per_letter on public.email_outbox (letter_id, kind) where letter_id is not null;
create index email_outbox_queue on public.email_outbox (status, next_attempt_at);
alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from anon, authenticated;

-- ── Daily send quota per provider (UTC day) ────────────────────────────────
create table public.daily_quota (
  provider text not null,
  day      date not null,
  used     integer not null default 0,
  primary key (provider, day)
);
alter table public.daily_quota enable row level security;
revoke all on public.daily_quota from anon, authenticated;

-- Reserve one send. Returns false (and reserves nothing) when the day is full.
create function public.quota_take(p_provider text, p_limit integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  ok boolean;
begin
  insert into public.daily_quota (provider, day, used)
  values (p_provider, (now() at time zone 'utc')::date, 0)
  on conflict do nothing;
  update public.daily_quota
     set used = used + 1
   where provider = p_provider and day = (now() at time zone 'utc')::date and used < p_limit
  returning true into ok;
  return coalesce(ok, false);
end $$;

-- Give a reservation back (provider refused before sending).
create function public.quota_release(p_provider text) returns void
language sql security definer set search_path = '' as $$
  update public.daily_quota set used = greatest(used - 1, 0)
   where provider = p_provider and day = (now() at time zone 'utc')::date;
$$;

-- ── Letters: claim, mark sent, mark failed, sweep ──────────────────────────
create function public.claim_due_letters(p_limit integer)
returns table (id uuid, recipient_email text, email_hash text, body_ciphertext bytea, body_iv bytea,
               key_version smallint, created_at timestamptz, deliver_at timestamptz, attempts integer,
               timezone text, event_name text)
language plpgsql security definer set search_path = '' as $$
begin
  -- Suppressed addresses never receive anything: drop those letters first.
  delete from public.letters l
   where l.status = 'sealed' and l.deliver_at <= now()
     and exists (select 1 from public.suppressed_emails s where s.email_hash = l.email_hash);

  return query
  with due as (
    select l.id from public.letters l
     where l.status = 'sealed' and l.deliver_at <= now()
       and coalesce(l.next_attempt_at, '-infinity') <= now()
     order by l.deliver_at
     limit p_limit
     for update skip locked
  ), claimed as (
    update public.letters l
       set status = 'sending', attempts = l.attempts + 1
      from due where l.id = due.id
    returning l.*
  )
  select c.id, c.recipient_email, c.email_hash, c.body_ciphertext, c.body_iv, c.key_version,
         c.created_at, c.deliver_at, c.attempts, c.timezone, e.name
    from claimed c left join public.events e on e.id = c.event_id;
end $$;

create function public.mark_letter_sent(p_id uuid, p_provider text, p_message_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.letters
     set status = 'delivered', delivered_at = now(), last_error = null, next_attempt_at = null
   where id = p_id and status = 'sending';
  insert into public.send_log (letter_id, kind, attempt, provider, provider_message_id, status)
  select p_id, 'letter', attempts, p_provider, p_message_id, 'sent' from public.letters where id = p_id;
end $$;

-- p_refund: the provider was unavailable (bad key, quota, outage), so this
-- doesn't count as one of the 3 attempts.
create function public.mark_letter_failed(p_id uuid, p_error text, p_refund boolean, p_retry_at timestamptz)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  a integer;
  outcome text;
begin
  select attempts into a from public.letters where id = p_id and status = 'sending' for update;
  if not found then return 'not_sending'; end if;
  if p_refund then
    a := a - 1;
  end if;
  if a >= 3 then
    update public.letters set status = 'failed', attempts = a, last_error = left(p_error, 500) where id = p_id;
    outcome := 'failed';
  else
    update public.letters
       set status = 'sealed', attempts = a, last_error = left(p_error, 500),
           next_attempt_at = coalesce(p_retry_at, now() + case a when 1 then interval '1 hour' else interval '4 hours' end)
     where id = p_id;
    outcome := 'retry';
  end if;
  insert into public.send_log (letter_id, kind, attempt, status, error)
  values (p_id, 'letter', greatest(a, 1), case when p_refund then 'deferred' else 'error' end, left(p_error, 500));
  return outcome;
end $$;

-- Letters stuck in 'sending' (function crashed mid-send). If the log shows the
-- provider accepted it, it was delivered; otherwise we can't know, so flag it
-- for review rather than risk a second copy.
create function public.sweep_stuck_letters() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  update public.letters l
     set status = case when exists (select 1 from public.send_log s where s.letter_id = l.id and s.kind = 'letter' and s.status = 'sent')
                       then 'delivered'::public.letter_status else 'failed'::public.letter_status end,
         delivered_at = case when exists (select 1 from public.send_log s where s.letter_id = l.id and s.kind = 'letter' and s.status = 'sent')
                       then now() else null end,
         last_error = 'Interrupted while sending. Check the provider log before retrying.'
   where l.status = 'sending' and l.updated_at < now() - interval '30 minutes';
  get diagnostics n = row_count;
  return n;
end $$;

-- ── Outbox ──────────────────────────────────────────────────────────────────
create function public.claim_outbox(p_limit integer, p_id uuid default null)
returns table (id uuid, kind text, letter_id uuid, attempts integer)
language sql security definer set search_path = '' as $$
  with picked as (
    select o.id from public.email_outbox o
     where o.status = 'queued' and o.next_attempt_at <= now()
       and (p_id is null or o.id = p_id)
     order by o.created_at
     limit p_limit
     for update skip locked
  )
  update public.email_outbox o
     set status = 'sending', attempts = o.attempts + 1
    from picked where o.id = picked.id
  returning o.id, o.kind, o.letter_id, o.attempts;
$$;

create function public.finish_outbox(p_id uuid, p_ok boolean, p_error text, p_refund boolean, p_retry_at timestamptz)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  a integer;
begin
  select attempts into a from public.email_outbox where id = p_id;
  if p_ok then
    update public.email_outbox set status = 'sent', sent_at = now(), last_error = null where id = p_id;
  elsif p_refund or a < 5 then
    update public.email_outbox
       set status = 'queued',
           attempts = case when p_refund then a - 1 else a end,
           last_error = left(p_error, 500),
           next_attempt_at = coalesce(p_retry_at, now() + (interval '5 minutes' * power(2, a)))
     where id = p_id;
  else
    update public.email_outbox set status = 'failed', last_error = left(p_error, 500) where id = p_id;
  end if;
end $$;

-- ── Cancelling and opting out ───────────────────────────────────────────────
-- Cancelled letters are deleted outright (Privacy Policy: removed straight away).

create function public.cancel_letter(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  delete from public.letters where id = p_id and status in ('pending_verification', 'sealed', 'failed', 'draft');
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- "This wasn't me" / unsubscribe: block the address and remove everything waiting for it.
create function public.suppress_email(p_email_hash text, p_reason text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  insert into public.suppressed_emails (email_hash, reason) values (p_email_hash, p_reason)
  on conflict (email_hash) do nothing;
  delete from public.letters
   where email_hash = p_email_hash and status in ('pending_verification', 'sealed', 'failed');
  get diagnostics n = row_count;
  return n;
end $$;

-- Staff revoke: same as before, but cancelled letters are deleted.
create or replace function public.revoke_kiosk(p_kiosk_id uuid, p_cancel_letters boolean default false)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer := 0;
begin
  update public.kiosks set active = false, revoked_at = now() where id = p_kiosk_id;
  if p_cancel_letters then
    delete from public.letters where kiosk_id = p_kiosk_id and status in ('pending_verification', 'sealed', 'failed');
    get diagnostics n = row_count;
  end if;
  return n;
end $$;

-- ── Retention (run daily) ───────────────────────────────────────────────────
create function public.run_retention() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := '{}';
  n integer;
begin
  -- Letters written without an account: deleted 90 days after delivery.
  delete from public.letters where user_id is null and status = 'delivered' and delivered_at < now() - interval '90 days';
  get diagnostics n = row_count; r := r || jsonb_build_object('guest_delivered', n);
  -- Unverified web letters older than 7 days.
  delete from public.letters where status = 'pending_verification' and created_at < now() - interval '7 days';
  get diagnostics n = row_count; r := r || jsonb_build_object('unverified', n);
  -- Anything still marked cancelled.
  delete from public.letters where status = 'cancelled';
  get diagnostics n = row_count; r := r || jsonb_build_object('cancelled', n);
  -- Rate-limit records: 7 days. Delivery logs: 12 months. Sent outbox rows: 30 days.
  delete from public.rate_events where created_at < now() - interval '7 days';
  delete from public.send_log where created_at < now() - interval '12 months';
  delete from public.email_outbox where status in ('sent', 'cancelled') and created_at < now() - interval '30 days';
  delete from public.daily_quota where day < (now() at time zone 'utc')::date - 30;
  return r;
end $$;

-- ── Lock down ───────────────────────────────────────────────────────────────
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.quota_take(text, integer)', 'public.quota_release(text)',
    'public.claim_due_letters(integer)', 'public.mark_letter_sent(uuid, text, text)',
    'public.mark_letter_failed(uuid, text, boolean, timestamptz)', 'public.sweep_stuck_letters()',
    'public.claim_outbox(integer, uuid)', 'public.finish_outbox(uuid, boolean, text, boolean, timestamptz)',
    'public.cancel_letter(uuid)', 'public.suppress_email(text, text)', 'public.run_retention()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- ── Scheduler ───────────────────────────────────────────────────────────────
-- Needs two Vault secrets, set once per project (NOT in this file):
--   select vault.create_secret('https://<ref>.supabase.co', 'dfm_project_url');
--   select vault.create_secret('<same value as CRON_SECRET>', 'dfm_cron_secret');
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create function public.dispatch_job(p_job text) returns bigint
language sql security definer set search_path = '' as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'dfm_project_url') || '/functions/v1/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'dfm_cron_secret')
    ),
    body := jsonb_build_object('job', p_job),
    timeout_milliseconds := 120000
  );
$$;
revoke all on function public.dispatch_job(text) from public, anon, authenticated;

select cron.schedule('dfm-outbox',      '*/5 * * * *', $$ select public.dispatch_job('outbox') $$);
select cron.schedule('dfm-letters',     '0 * * * *',   $$ select public.dispatch_job('letters') $$);
select cron.schedule('dfm-maintenance', '17 19 * * *', $$ select public.dispatch_job('maintenance') $$); -- 03:17 Manila
