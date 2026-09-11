-- Fix Tuns Family price to 110 lei (run even if the previous services migration already ran).

update public.services
set price = 110,
    description = 'Tunsoare family'
where name = 'Tuns Family'
  and active = true;
