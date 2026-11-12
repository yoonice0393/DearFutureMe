-- RLS proof: user A cannot see or touch user B's letters, and the browser
-- roles cannot reach any internal table or server function.
--
-- Run against the linked project (everything is rolled back):
--   npx supabase test db --remote
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- ── Fixtures (as the migration owner) ───────────────────────────────────────
insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-8000-00000000000a', 'rls-a@test.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000000b', 'rls-b@test.invalid', 'authenticated', 'authenticated');

select is(
  (select count(*)::int from public.profiles where email like 'rls-_@test.invalid'),
  2, 'signing up creates a profile per user'
);

insert into public.letters (id, user_id, recipient_email, email_hash, source, body_ciphertext, body_iv, deliver_at, status, consent_at)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'rls-a@test.invalid', 'hash-a', 'web', '\x00', '\x00', now() + interval '1 year', 'sealed', now()),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b', 'rls-b@test.invalid', 'hash-b', 'web', '\x00', '\x00', now() + interval '1 year', 'sealed', now()),
  ('00000000-0000-4000-8000-0000000000c1', null,                                   'booth@test.invalid', 'hash-c', 'web', '\x00', '\x00', now() + interval '1 year', 'sealed', now());

-- ── As user A ───────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

select results_eq(
  $$ select id::text from public.letters order by id $$,
  $$ values ('00000000-0000-4000-8000-0000000000a1') $$,
  'user A sees exactly their own letter'
);
select is_empty(
  $$ select 1 from public.letters where user_id = '00000000-0000-4000-8000-00000000000b' $$,
  'user A cannot read user B''s letters'
);
select is_empty(
  $$ select 1 from public.letters where user_id is null $$,
  'user A cannot read letters that belong to no account (booth/guest)'
);
select results_eq(
  $$ select email from public.profiles $$,
  $$ values ('rls-a@test.invalid') $$,
  'user A sees only their own profile'
);

select throws_ok(
  $$ insert into public.letters (id, user_id, source, body_ciphertext, body_iv)
     values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a', 'web', '\x00', '\x00') $$,
  '42501', null, 'user A cannot insert letters directly'
);
select throws_ok(
  $$ update public.letters set status = 'cancelled' where id = '00000000-0000-4000-8000-0000000000b1' $$,
  '42501', null, 'user A cannot update letters (not even B''s)'
);
select throws_ok(
  $$ delete from public.letters where id = '00000000-0000-4000-8000-0000000000b1' $$,
  '42501', null, 'user A cannot delete letters'
);
select throws_ok(
  $$ update public.profiles set role = 'admin' $$,
  '42501', null, 'user A cannot make themselves admin'
);
select throws_ok($$ select * from public.events $$,              '42501', null, 'events are hidden from users');
select throws_ok($$ select * from public.kiosks $$,              '42501', null, 'kiosks are hidden from users');
select throws_ok($$ select * from public.email_outbox $$,       '42501', null, 'the email queue is hidden from users');
select throws_ok($$ select * from public.daily_quota $$,        '42501', null, 'send quotas are hidden from users');
select throws_ok($$ select * from public.suppressed_emails $$,   '42501', null, 'suppression list is hidden from users');
select throws_ok(
  $$ select public.create_letter(gen_random_uuid(), null, 'x@test.invalid', 'h', 'web', null, null, false,
       '\x00', '\x00', now() + interval '1 year', null, 'sealed', 'v', 3) $$,
  '42501', null, 'users cannot call create_letter'
);
select throws_ok(
  $$ select public.verify_staff_pin('any', '000000') $$,
  '42501', null, 'users cannot call verify_staff_pin'
);

-- ── As user B: the mirror image ────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select results_eq(
  $$ select id::text from public.letters $$,
  $$ values ('00000000-0000-4000-8000-0000000000b1') $$,
  'user B sees exactly their own letter'
);

-- ── As an anonymous visitor ─────────────────────────────────────────────────
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select * from public.letters $$,  '42501', null, 'anonymous visitors cannot read letters');
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anonymous visitors cannot read profiles');
select throws_ok(
  $$ select public.rate_hit('x', 'y', interval '1 minute', 1) $$,
  '42501', null, 'anonymous visitors cannot call rate_hit'
);

select * from finish();
rollback;
