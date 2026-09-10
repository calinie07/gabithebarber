-- Busy ranges for availability (no customer PII).
-- Fixes double-booking risk: customers previously could only "see" their own appointments.

create or replace function public.get_busy_ranges(
  p_from timestamptz,
  p_to timestamptz
)
returns table (start_time timestamptz, end_time timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select a.start_time, a.end_time
  from public.appointments a
  where a.status = 'confirmed'
    and a.start_time < p_to
    and a.end_time > p_from
  union all
  select b.start_time, b.end_time
  from public.blocked_times b
  where b.start_time < p_to
    and b.end_time > p_from;
$$;

revoke all on function public.get_busy_ranges(timestamptz, timestamptz) from public;
grant execute on function public.get_busy_ranges(timestamptz, timestamptz) to authenticated;
grant execute on function public.get_busy_ranges(timestamptz, timestamptz) to anon;
