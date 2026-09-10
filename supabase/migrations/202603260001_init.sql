-- =============================================================================
-- Barber booking MVP schema (Europe/Bucharest business logic in app layer)
-- Run in Supabase SQL editor or via supabase db push / migration tooling.
-- =============================================================================

create extension if not exists btree_gist;

-- Roles
create type public.user_role as enum ('customer', 'admin');
create type public.appointment_status as enum ('confirmed', 'cancelled');
create type public.notification_type as enum (
  'booking_created',
  'booking_cancelled',
  'customer_registered'
);

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- shop_settings (single-row config)
-- ---------------------------------------------------------------------------
create table public.shop_settings (
  id int primary key default 1 check (id = 1),
  name text not null,
  phone text not null,
  address text not null,
  maps_query text,
  email text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index services_active_idx on public.services (active);

-- ---------------------------------------------------------------------------
-- working_hours (0 = Sunday … 6 = Saturday, Postgres EXTRACT(DOW))
-- ---------------------------------------------------------------------------
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_closed boolean not null default false,
  open_time time,
  close_time time,
  unique (day_of_week),
  check (
    is_closed
    or (open_time is not null and close_time is not null and open_time < close_time)
  )
);

-- ---------------------------------------------------------------------------
-- blocked_times (breaks / blocked periods)
-- ---------------------------------------------------------------------------
create table public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (start_time < end_time)
);

create index blocked_times_range_idx on public.blocked_times (start_time, end_time);

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status public.appointment_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

create index appointments_customer_start_idx
  on public.appointments (customer_id, start_time desc);

create index appointments_status_start_idx
  on public.appointments (status, start_time);

create index appointments_start_end_idx
  on public.appointments (start_time, end_time);

-- Prevent overlapping confirmed appointments (DB-level double-booking guard)
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status = 'confirmed');

-- ---------------------------------------------------------------------------
-- admin_notifications (activity feed — not push)
-- ---------------------------------------------------------------------------
create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type public.notification_type not null,
  title text not null,
  message text not null,
  related_booking_id uuid references public.appointments (id) on delete set null,
  related_customer_id uuid references public.profiles (id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index admin_notifications_created_idx
  on public.admin_notifications (created_at desc);

create index admin_notifications_unread_idx
  on public.admin_notifications (read, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create trigger shop_settings_set_updated_at
  before update on public.shop_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth → profile bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_name text;
  chosen_phone text;
begin
  chosen_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(new.email, 'client'), '@', 1)
  );
  chosen_phone := new.raw_user_meta_data ->> 'phone';

  insert into public.profiles (id, role, full_name, phone)
  values (new.id, 'customer', chosen_name, chosen_phone);

  insert into public.admin_notifications (type, title, message, related_customer_id)
  values (
    'customer_registered',
    'Client nou',
    chosen_name || ' s-a înregistrat.',
    new.id
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers for RLS
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.shop_settings enable row level security;
alter table public.services enable row level security;
alter table public.working_hours enable row level security;
alter table public.blocked_times enable row level security;
alter table public.appointments enable row level security;
alter table public.admin_notifications enable row level security;

-- profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile (non-role fields)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- shop_settings
create policy "Anyone authenticated can read shop settings"
  on public.shop_settings for select
  to authenticated
  using (true);

create policy "Public can read shop settings"
  on public.shop_settings for select
  to anon
  using (true);

create policy "Admins manage shop settings"
  on public.shop_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- services
create policy "Anyone can read active services"
  on public.services for select
  using (active = true or public.is_admin());

create policy "Admins manage services"
  on public.services for all
  using (public.is_admin())
  with check (public.is_admin());

-- working_hours
create policy "Anyone can read working hours"
  on public.working_hours for select
  using (true);

create policy "Admins manage working hours"
  on public.working_hours for all
  using (public.is_admin())
  with check (public.is_admin());

-- blocked_times: customers need read for availability via server;
-- still allow authenticated read (slots are computed server-side anyway)
create policy "Authenticated can read blocked times"
  on public.blocked_times for select
  to authenticated
  using (true);

create policy "Admins manage blocked times"
  on public.blocked_times for all
  using (public.is_admin())
  with check (public.is_admin());

-- appointments
create policy "Customers read own appointments"
  on public.appointments for select
  using (auth.uid() = customer_id or public.is_admin());

create policy "Customers create own appointments"
  on public.appointments for insert
  with check (auth.uid() = customer_id and status = 'confirmed');

create policy "Customers cancel own appointments"
  on public.appointments for update
  using (auth.uid() = customer_id or public.is_admin())
  with check (
    (auth.uid() = customer_id and status in ('confirmed', 'cancelled'))
    or public.is_admin()
  );

create policy "Admins manage appointments"
  on public.appointments for all
  using (public.is_admin())
  with check (public.is_admin());

-- admin_notifications
create policy "Admins read notifications"
  on public.admin_notifications for select
  using (public.is_admin());

create policy "Admins update notifications"
  on public.admin_notifications for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins insert notifications"
  on public.admin_notifications for insert
  with check (public.is_admin());

-- Authenticated customers may insert booking-related notifications via trigger/RPC later;
-- for MVP, booking actions will insert via security definer function.

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
  select full_name into customer_name from public.profiles where id = new.customer_id;
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

create trigger appointments_notify_admin
  after insert or update of status on public.appointments
  for each row execute function public.notify_admin_booking();

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------
insert into public.shop_settings (id, name, phone, address, maps_query, email)
values (
  1,
  'Gabi Barber',
  '+40721234567',
  'Strada Exemplu 12, București',
  'Strada Exemplu 12, București',
  'contact@gabibarber.ro'
);

insert into public.services (name, description, duration_minutes, price, active)
values
  ('Haircut', 'Tunsoare clasică', 45, 80, true),
  ('Haircut + Beard', 'Tunsoare și barbă', 60, 110, true),
  ('Beard', 'Aranjare barbă', 30, 50, true);

insert into public.working_hours (day_of_week, is_closed, open_time, close_time)
values
  (1, false, '09:00', '18:00'), -- Mon
  (2, false, '09:00', '18:00'), -- Tue
  (3, false, '09:00', '18:00'), -- Wed
  (4, false, '09:00', '18:00'), -- Thu
  (5, false, '09:00', '18:00'), -- Fri
  (6, false, '09:00', '14:00'), -- Sat
  (0, true, null, null);       -- Sun closed

-- ---------------------------------------------------------------------------
-- ADMIN BOOTSTRAP (run AFTER creating the admin auth user in Supabase):
--
--   update public.profiles
--   set role = 'admin', full_name = 'Gabi Admin', phone = '+40721234567'
--   where id = '<auth-user-uuid>';
--
-- ---------------------------------------------------------------------------
