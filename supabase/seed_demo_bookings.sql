-- =============================================================================
-- Demo seed: phone-first clients + packed calendar (tomorrow + next Monday)
-- Run in Supabase SQL Editor. Safe to re-run (clears previous [SEED] data).
-- Timezone: Europe/Bucharest
-- =============================================================================

do $$
declare
  d_tom date;
  d_mon date;
  c uuid[] := array[]::uuid[];
  s_tunsoare uuid;
  s_tun_barba uuid;
  s_tun_spalat uuid;
  s_full uuid;
  s_barba uuid;
  s_spalat uuid;
  s_aranjat uuid;
  s_family uuid;
  cust_id uuid;
  i int;
  names text[] := array[
    'Mihai Popescu',
    'Andrei Ionescu',
    'Cristian Radu',
    'Alexandru Dobre',
    'Vlad Marin',
    'Ionuț Stan',
    'George Enache',
    'Daniel Florea',
    'Bogdan Luca',
    'Ștefan Nistor',
    'Răzvan Preda',
    'Florin Munteanu',
    'Paul Ciobanu',
    'Adrian Toma',
    'Cosmin Albu',
    'Marian Neagu'
  ];
begin
  d_tom := (timezone('Europe/Bucharest', now()))::date + 1;
  -- Next Monday on or after tomorrow (Postgres DOW: 0=Sun … 6=Sat)
  d_mon := d_tom + ((1 - extract(dow from d_tom)::int + 7) % 7);

  delete from public.appointments
  where customer_id in (
    select id from public.customers where phone like '+407990%'
  );

  delete from public.blocked_times
  where reason like '[SEED]%';

  delete from public.admin_notifications
  where related_customer_id in (
    select id from public.customers where phone like '+407990%'
  );

  delete from public.customers where phone like '+407990%';

  select id into s_tunsoare from public.services where name = 'Tunsoare Băieți' and active limit 1;
  select id into s_tun_barba from public.services where name = 'Pachet Tunsoare + Barbă' and active limit 1;
  select id into s_tun_spalat from public.services where name = 'Pachet Tuns + Spălat' and active limit 1;
  select id into s_full from public.services where name = 'Pachet Full' and active limit 1;
  select id into s_barba from public.services where name = 'Aranjat barbă' and active limit 1;
  select id into s_spalat from public.services where name = 'Spălat pe cap' and active limit 1;
  select id into s_aranjat from public.services where name = 'Aranjat' and active limit 1;
  select id into s_family from public.services where name = 'Tuns Family' and active limit 1;

  if s_tunsoare is null or s_tun_barba is null or s_tun_spalat is null
     or s_full is null or s_barba is null or s_spalat is null
     or s_aranjat is null or s_family is null then
    raise exception 'Active services missing — run 202609110001_update_services_and_shop.sql first';
  end if;

  for i in 1..16 loop
    insert into public.customers (full_name, phone)
    values (names[i], '+407990' || lpad(i::text, 5, '0'))
    returning id into cust_id;
    c := array_append(c, cust_id);
  end loop;

  -- -------------------------------------------------------------------------
  -- TOMORROW (Sat is 09:00–14:00): 10 bookings + 1 break
  -- -------------------------------------------------------------------------
  insert into public.blocked_times (start_time, end_time, reason)
  values (
    timezone('Europe/Bucharest', d_tom + time '11:30'),
    timezone('Europe/Bucharest', d_tom + time '12:00'),
    '[SEED] Pauză cafea'
  );

  insert into public.appointments (customer_id, service_id, start_time, end_time, status)
  values
    (c[1],  s_tunsoare,   timezone('Europe/Bucharest', d_tom + time '09:00'), timezone('Europe/Bucharest', d_tom + time '09:20'), 'confirmed'),
    (c[2],  s_tun_barba,  timezone('Europe/Bucharest', d_tom + time '09:20'), timezone('Europe/Bucharest', d_tom + time '09:50'), 'confirmed'),
    (c[3],  s_spalat,     timezone('Europe/Bucharest', d_tom + time '09:50'), timezone('Europe/Bucharest', d_tom + time '10:05'), 'confirmed'),
    (c[4],  s_full,       timezone('Europe/Bucharest', d_tom + time '10:05'), timezone('Europe/Bucharest', d_tom + time '10:45'), 'confirmed'),
    (c[5],  s_barba,      timezone('Europe/Bucharest', d_tom + time '10:45'), timezone('Europe/Bucharest', d_tom + time '11:05'), 'confirmed'),
    (c[6],  s_tunsoare,   timezone('Europe/Bucharest', d_tom + time '11:05'), timezone('Europe/Bucharest', d_tom + time '11:25'), 'confirmed'),
    (c[7],  s_family,     timezone('Europe/Bucharest', d_tom + time '12:00'), timezone('Europe/Bucharest', d_tom + time '12:40'), 'confirmed'),
    (c[8],  s_tunsoare,   timezone('Europe/Bucharest', d_tom + time '12:40'), timezone('Europe/Bucharest', d_tom + time '13:00'), 'confirmed'),
    (c[9],  s_aranjat,    timezone('Europe/Bucharest', d_tom + time '13:00'), timezone('Europe/Bucharest', d_tom + time '13:30'), 'confirmed'),
    (c[10], s_barba,      timezone('Europe/Bucharest', d_tom + time '13:30'), timezone('Europe/Bucharest', d_tom + time '13:50'), 'confirmed');

  -- -------------------------------------------------------------------------
  -- MONDAY (09:00–18:00): 20 bookings + 2 breaks
  -- -------------------------------------------------------------------------
  insert into public.blocked_times (start_time, end_time, reason)
  values
    (
      timezone('Europe/Bucharest', d_mon + time '12:30'),
      timezone('Europe/Bucharest', d_mon + time '13:00'),
      '[SEED] Pauză prânz'
    ),
    (
      timezone('Europe/Bucharest', d_mon + time '15:45'),
      timezone('Europe/Bucharest', d_mon + time '16:00'),
      '[SEED] Pauză scurtă'
    );

  insert into public.appointments (customer_id, service_id, start_time, end_time, status)
  values
    (c[1],  s_tunsoare,   timezone('Europe/Bucharest', d_mon + time '09:00'), timezone('Europe/Bucharest', d_mon + time '09:20'), 'confirmed'),
    (c[2],  s_tun_barba,  timezone('Europe/Bucharest', d_mon + time '09:20'), timezone('Europe/Bucharest', d_mon + time '09:50'), 'confirmed'),
    (c[3],  s_spalat,     timezone('Europe/Bucharest', d_mon + time '09:50'), timezone('Europe/Bucharest', d_mon + time '10:05'), 'confirmed'),
    (c[4],  s_barba,      timezone('Europe/Bucharest', d_mon + time '10:05'), timezone('Europe/Bucharest', d_mon + time '10:25'), 'confirmed'),
    (c[5],  s_tun_spalat, timezone('Europe/Bucharest', d_mon + time '10:25'), timezone('Europe/Bucharest', d_mon + time '10:55'), 'confirmed'),
    (c[6],  s_tunsoare,   timezone('Europe/Bucharest', d_mon + time '10:55'), timezone('Europe/Bucharest', d_mon + time '11:15'), 'confirmed'),
    (c[7],  s_tun_barba,  timezone('Europe/Bucharest', d_mon + time '11:15'), timezone('Europe/Bucharest', d_mon + time '11:45'), 'confirmed'),
    (c[8],  s_aranjat,    timezone('Europe/Bucharest', d_mon + time '11:45'), timezone('Europe/Bucharest', d_mon + time '12:15'), 'confirmed'),
    (c[9],  s_tunsoare,   timezone('Europe/Bucharest', d_mon + time '13:00'), timezone('Europe/Bucharest', d_mon + time '13:20'), 'confirmed'),
    (c[10], s_tun_barba,  timezone('Europe/Bucharest', d_mon + time '13:20'), timezone('Europe/Bucharest', d_mon + time '13:50'), 'confirmed'),
    (c[11], s_spalat,     timezone('Europe/Bucharest', d_mon + time '13:50'), timezone('Europe/Bucharest', d_mon + time '14:05'), 'confirmed'),
    (c[12], s_tun_spalat, timezone('Europe/Bucharest', d_mon + time '14:05'), timezone('Europe/Bucharest', d_mon + time '14:35'), 'confirmed'),
    (c[13], s_barba,      timezone('Europe/Bucharest', d_mon + time '14:35'), timezone('Europe/Bucharest', d_mon + time '14:55'), 'confirmed'),
    (c[14], s_tun_spalat, timezone('Europe/Bucharest', d_mon + time '14:55'), timezone('Europe/Bucharest', d_mon + time '15:25'), 'confirmed'),
    (c[15], s_tunsoare,   timezone('Europe/Bucharest', d_mon + time '15:25'), timezone('Europe/Bucharest', d_mon + time '15:45'), 'confirmed'),
    (c[16], s_tunsoare,   timezone('Europe/Bucharest', d_mon + time '16:00'), timezone('Europe/Bucharest', d_mon + time '16:20'), 'confirmed'),
    (c[1],  s_tun_spalat, timezone('Europe/Bucharest', d_mon + time '16:20'), timezone('Europe/Bucharest', d_mon + time '16:50'), 'confirmed'),
    (c[2],  s_aranjat,    timezone('Europe/Bucharest', d_mon + time '16:50'), timezone('Europe/Bucharest', d_mon + time '17:20'), 'confirmed'),
    (c[3],  s_spalat,     timezone('Europe/Bucharest', d_mon + time '17:20'), timezone('Europe/Bucharest', d_mon + time '17:35'), 'confirmed'),
    (c[4],  s_barba,      timezone('Europe/Bucharest', d_mon + time '17:35'), timezone('Europe/Bucharest', d_mon + time '17:55'), 'confirmed');

  raise notice 'Seed OK: tomorrow %, Monday % — 16 clients, 30 appointments, 3 breaks', d_tom, d_mon;
end $$;
