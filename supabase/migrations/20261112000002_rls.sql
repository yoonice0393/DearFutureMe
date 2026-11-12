-- Row Level Security and grants.
--
-- Model: the browser may only READ its own profile and its own letters.
-- Every write goes through an Edge Function using the service role, because
-- that is where validation, rate limits and encryption happen.

-- RLS on every table, no exceptions.
alter table public.profiles            enable row level security;
alter table public.events              enable row level security;
alter table public.kiosks              enable row level security;
alter table public.letters             enable row level security;
alter table public.email_verifications enable row level security;
alter table public.send_log            enable row level security;
alter table public.suppressed_emails   enable row level security;
alter table public.rate_events         enable row level security;

-- Supabase's default privileges grant anon/authenticated everything on new
-- tables and rely on RLS alone. Revoke, then grant back the minimum.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;

-- profiles: read your own row.
grant select on public.profiles to authenticated;
create policy "profiles: owner can read"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

-- letters: read your own rows (metadata + ciphertext; the key never leaves the Edge Function).
grant select on public.letters to authenticated;
create policy "letters: owner can read"
  on public.letters for select to authenticated
  using (user_id = (select auth.uid()));

-- events, kiosks, email_verifications, send_log, suppressed_emails, rate_events:
-- no grants and no policies → unreachable from the browser. Service role only.

-- ── Profiles follow auth.users ──────────────────────────────────────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

revoke all on function public.handle_new_user() from anon, authenticated, public;
revoke all on function public.handle_user_email_change() from anon, authenticated, public;
