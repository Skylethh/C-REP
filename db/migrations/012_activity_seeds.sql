-- Seed example activities (expand as needed)
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('electricity_grid', 'Elektrik (şebeke)', 'energy', 'scope2', 'electricity', 'kWh', '{kWh}'),
  ('diesel_fuel', 'Dizel Yakıt', 'energy', 'scope1', 'fuel', 'L', '{L,kg}'),
  ('passenger_car', 'Binek Araç', 'transport', 'scope3', 'vehicle', 'km', '{km}'),
  ('concrete', 'Beton', 'materials', 'scope3', 'construction', 'm3', '{m3,kg}')
on conflict do nothing;


