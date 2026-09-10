-- Promote demo admin after creating users (npm run seed:demo).

update public.profiles
set role = 'admin',
    full_name = 'Gabi Admin',
    phone = '+40721234567'
where id = (
  select id from auth.users where email = 'admin@example.com'
);

update public.profiles
set full_name = 'Alex Client',
    phone = '+40722111222'
where id = (
  select id from auth.users where email = 'client@example.com'
);
