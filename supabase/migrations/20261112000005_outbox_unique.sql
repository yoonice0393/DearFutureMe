-- Fix: the partial unique index (… where letter_id is not null) can't be used as
-- an ON CONFLICT target, so queueing a receipt from /verify failed with 42P10.
-- A plain unique constraint works, and heartbeat rows (letter_id null) still
-- never collide because NULLs are distinct.
drop index if exists public.email_outbox_one_per_letter;
alter table public.email_outbox
  add constraint email_outbox_one_per_letter unique (letter_id, kind);
