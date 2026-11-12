-- Phase 6: the admin page creates events and changes PINs through the `admin`
-- Edge Function (service role). These were only callable from the SQL editor.
grant execute on function public.create_event(text, text, timestamptz, timestamptz, text, integer, integer) to service_role;
grant execute on function public.set_event_pin(text, text) to service_role;

-- Per-event counts for staff: numbers only, never content or addresses.
create function public.event_stats()
returns table (
  event_id uuid, name text, slug text, starts_at timestamptz, ends_at timestamptz, paused boolean,
  submission_cap integer, static_code_cap integer,
  letters integer, booth integer, phone integer, via_static integer
)
language sql security definer set search_path = '' stable as $$
  select e.id, e.name, e.slug, e.starts_at, e.ends_at, e.paused, e.submission_cap, e.static_code_cap,
         count(l.id)::int,
         count(l.id) filter (where l.source = 'booth')::int,
         count(l.id) filter (where l.source = 'event_phone')::int,
         count(l.id) filter (where l.via_static_code)::int
    from public.events e
    left join public.letters l on l.event_id = e.id and l.status <> 'cancelled'
   group by e.id
   order by e.starts_at desc;
$$;

create function public.kiosk_stats()
returns table (kiosk_id uuid, event_id uuid, label text, active boolean, created_at timestamptz, revoked_at timestamptz, letters integer)
language sql security definer set search_path = '' stable as $$
  select k.id, k.event_id, k.label, k.active, k.created_at, k.revoked_at, count(l.id)::int
    from public.kiosks k
    left join public.letters l on l.kiosk_id = k.id and l.status <> 'cancelled'
   group by k.id
   order by k.created_at;
$$;

create function public.queue_stats()
returns table (status text, n integer)
language sql security definer set search_path = '' stable as $$
  select status::text, count(*)::int from public.letters group by status
  union all
  select 'outbox_' || status, count(*)::int from public.email_outbox group by status;
$$;

revoke all on function public.event_stats() from public, anon, authenticated;
revoke all on function public.kiosk_stats() from public, anon, authenticated;
revoke all on function public.queue_stats() from public, anon, authenticated;
grant execute on function public.event_stats() to service_role;
grant execute on function public.kiosk_stats() to service_role;
grant execute on function public.queue_stats() to service_role;
