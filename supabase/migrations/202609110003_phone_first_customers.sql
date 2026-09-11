-- Phone-first customers (no email required for call-in clients).
-- Appointments will reference customers instead of profiles.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default '',
  phone text not null,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_phone_unique unique (phone)
);

create index if not exists customers_phone_idx on public.customers (phone);
create index if not exists customers_name_idx on public.customers (full_name);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- Backfill from existing customer profiles (keep same id so appointments still match).
insert into public.customers (id, full_name, phone, auth_user_id)
select
  p.id,
  coalesce(nullif(trim(p.full_name), ''), 'Client'),
  coalesce(
    nullif(trim(p.phone), ''),
    '+40temp-' || replace(p.id::text, '-', '')
  ),
  p.id
from (
  select distinct on (
    coalesce(nullif(trim(phone), ''), id::text)
  )
    id, full_name, phone, created_at
  from public.profiles
  where role = 'customer'
  order by
    coalesce(nullif(trim(phone), ''), id::text),
    created_at asc
) p
on conflict (id) do nothing;

-- Any appointment whose customer_id is not yet in customers (e.g. edge cases)
insert into public.customers (id, full_name, phone, auth_user_id)
select
  p.id,
  coalesce(nullif(trim(p.full_name), ''), 'Client'),
  coalesce(
    nullif(trim(p.phone), ''),
    '+40temp-' || replace(p.id::text, '-', '')
  ),
  case when p.role = 'customer' then p.id else null end
from public.appointments a
join public.profiles p on p.id = a.customer_id
where not exists (select 1 from public.customers c where c.id = a.customer_id)
on conflict (id) do nothing;

-- Repoint appointments FK to customers
alter table public.appointments
  drop constraint if exists appointments_customer_id_fkey;

alter table public.appointments
  add constraint appointments_customer_id_fkey
  foreign key (customer_id) references public.customers (id) on delete restrict;

-- Notifications: related_customer_id should point at customers
-- Clear / backfill orphans BEFORE adding the FK.
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

update public.admin_notifications n
set related_customer_id = null
where n.related_customer_id is not null
  and not exists (
    select 1 from public.customers c where c.id = n.related_customer_id
  );

alter table public.admin_notifications
  drop constraint if exists admin_notifications_related_customer_id_fkey;

alter table public.admin_notifications
  add constraint admin_notifications_related_customer_id_fkey
  foreign key (related_customer_id) references public.customers (id) on delete set null;

-- Update booking notification trigger to read from customers
create or replace function public.notify_admin_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_name text;
  service_name text;
  msg text;
begin
  select full_name into customer_name from public.customers where id = new.customer_id;
  select name into service_name from public.services where id = new.service_id;

  if tg_op = 'INSERT' and new.status = 'confirmed' then
    msg := coalesce(customer_name, 'Client')
      || ' a rezervat '
      || coalesce(service_name, 'serviciu')
      || ' pentru '
      || to_char(new.start_time at time zone 'Europe/Bucharest', 'Dy HH24:MI');

    insert into public.admin_notifications (
      type, title, message, related_booking_id, related_customer_id
    ) values (
      'booking_created',
      'Rezervare nouă',
      msg,
      new.id,
      new.customer_id
    );
  elsif tg_op = 'UPDATE'
    and old.status = 'confirmed'
    and new.status = 'cancelled' then
    msg := coalesce(customer_name, 'Client')
      || ' a anulat '
      || coalesce(service_name, 'serviciu')
      || ' de la '
      || to_char(new.start_time at time zone 'Europe/Bucharest', 'Dy HH24:MI');

    insert into public.admin_notifications (
      type, title, message, related_booking_id, related_customer_id
    ) values (
      'booking_cancelled',
      'Rezervare anulată',
      msg,
      new.id,
      new.customer_id
    );
  end if;

  return new;
end;
$$;

-- On auth signup: ensure a customer row exists (phone-first). Keep profile for roles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_name text;
  chosen_phone text;
  normalized_phone text;
begin
  chosen_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(new.email, 'client'), '@', 1)
  );
  chosen_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');

  insert into public.profiles (id, role, full_name, phone)
  values (new.id, 'customer', chosen_name, chosen_phone);

  if chosen_phone is not null then
    normalized_phone := chosen_phone;

    update public.customers
    set
      auth_user_id = coalesce(auth_user_id, new.id),
      full_name = case
        when full_name is null or full_name = '' then chosen_name
        else full_name
      end
    where phone = normalized_phone;

    if not found then
      insert into public.customers (id, full_name, phone, auth_user_id)
      values (new.id, chosen_name, normalized_phone, new.id)
      on conflict (id) do update
        set phone = excluded.phone,
            auth_user_id = excluded.auth_user_id,
            full_name = excluded.full_name;
    end if;

    insert into public.admin_notifications (type, title, message, related_customer_id)
    values (
      'customer_registered',
      'Client nou',
      chosen_name || ' s-a înregistrat (' || normalized_phone || ').',
      (select id from public.customers where phone = normalized_phone limit 1)
    );
  else
    insert into public.customers (id, full_name, phone, auth_user_id)
    values (
      new.id,
      chosen_name,
      '+40temp-' || replace(new.id::text, '-', ''),
      new.id
    )
    on conflict (id) do nothing;

    insert into public.admin_notifications (type, title, message, related_customer_id)
    values (
      'customer_registered',
      'Client nou',
      chosen_name || ' s-a înregistrat.',
      new.id
    );
  end if;

  return new;
end;
$$;

alter table public.customers enable row level security;

create policy "Admins manage customers"
  on public.customers for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users read own customer row"
  on public.customers for select
  using (auth_user_id = auth.uid() or public.is_admin());

create policy "Users update own customer row"
  on public.customers for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Appointments: customers create for their own customer id (auth linked)
drop policy if exists "Customers create own appointments" on public.appointments;
drop policy if exists "Customers read own appointments" on public.appointments;
drop policy if exists "Customers cancel own appointments" on public.appointments;

create policy "Customers read own appointments"
  on public.appointments for select
  using (
    public.is_admin()
    or customer_id in (
      select c.id from public.customers c where c.auth_user_id = auth.uid()
    )
  );

create policy "Customers create own appointments"
  on public.appointments for insert
  with check (
    status = 'confirmed'
    and customer_id in (
      select c.id from public.customers c where c.auth_user_id = auth.uid()
    )
  );

create policy "Customers cancel own appointments"
  on public.appointments for update
  using (
    public.is_admin()
    or customer_id in (
      select c.id from public.customers c where c.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or customer_id in (
      select c.id from public.customers c where c.auth_user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.customers to authenticated;
grant select on public.customers to anon;
