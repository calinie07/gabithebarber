-- Update shop address + replace service menu (Romanian).
-- Safe to re-run: deactivates current active services, then inserts the new menu.

update public.shop_settings
set
  name = 'Gabi Barber',
  address = 'Strada Transilvaniei nr. 14, bl. A12, clădirea SWEN, Aiud',
  maps_query = 'Strada Transilvaniei 14, clădirea SWEN, Aiud',
  updated_at = now()
where id = 1;

-- Keep old rows for historical appointments; hide them from booking.
update public.services
set active = false
where active = true;

insert into public.services (name, description, duration_minutes, price, active)
values
  ('Tunsoare Băieți', 'Tunsoare pentru băieți', 20, 60, true),
  ('Pachet Tunsoare + Barbă', 'Tunsoare și aranjat barbă', 30, 70, true),
  ('Pachet Tuns + Spălat', 'Tunsoare cu spălat pe cap', 30, 70, true),
  ('Pachet Full', 'Pachet complet', 40, 80, true),
  ('Aranjat barbă', 'Aranjarea bărbii', 20, 20, true),
  ('Spălat pe cap', 'Spălat pe cap', 15, 20, true),
  ('Aranjat', 'Aranjat păr', 30, 50, true),
  ('Tuns Family', 'Tunsoare family', 40, 100, true);
