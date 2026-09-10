-- Grants so anon + authenticated can use the API with RLS.
-- Run this in Supabase SQL Editor if the app says it cannot load data.

grant usage on schema public to anon, authenticated;

grant select on public.services to anon, authenticated;
grant select on public.working_hours to anon, authenticated;
grant select on public.shop_settings to anon, authenticated;
grant select on public.blocked_times to authenticated;
grant select, insert, update on public.appointments to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.blocked_times to authenticated;
grant select, insert, update on public.admin_notifications to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.working_hours to authenticated;
grant select, insert, update, delete on public.shop_settings to authenticated;

-- Busy ranges RPC
grant execute on function public.get_busy_ranges(timestamptz, timestamptz) to anon, authenticated;

-- Helper RPCs used by RLS
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.current_role() to anon, authenticated;
