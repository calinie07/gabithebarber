-- Fix admin_notifications FK after phone-first customers migration.
-- Some related_customer_id values still pointed at profiles not present in customers.

-- 1) Create any missing customer rows from profiles for orphan notification refs
insert into public.customers (id, full_name, phone, auth_user_id)
select
  p.id,
  coalesce(nullif(trim(p.full_name), ''), 'Client'),
  coalesce(
    nullif(trim(p.phone), ''),
    '+40temp-' || replace(p.id::text, '-', '')
  ),
  case when p.role = 'customer' then p.id else null end
from public.admin_notifications n
join public.profiles p on p.id = n.related_customer_id
where n.related_customer_id is not null
  and not exists (
    select 1 from public.customers c where c.id = n.related_customer_id
  )
on conflict (id) do nothing;

-- 2) If phone unique blocked insert, null out remaining orphans
update public.admin_notifications n
set related_customer_id = null
where n.related_customer_id is not null
  and not exists (
    select 1 from public.customers c where c.id = n.related_customer_id
  );

-- 3) Ensure FK points at customers (drop old / recreate)
alter table public.admin_notifications
  drop constraint if exists admin_notifications_related_customer_id_fkey;

alter table public.admin_notifications
  add constraint admin_notifications_related_customer_id_fkey
  foreign key (related_customer_id) references public.customers (id) on delete set null;
