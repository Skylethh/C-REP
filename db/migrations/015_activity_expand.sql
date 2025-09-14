-- Expand activity library with concrete grades and map to factors

-- Activities
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('concrete_c20', 'Beton C20', 'materials', 'scope3', 'concrete', 'm3', '{m3,kg}'),
  ('concrete_c25', 'Beton C25', 'materials', 'scope3', 'concrete', 'm3', '{m3,kg}'),
  ('concrete_c30', 'Beton C30', 'materials', 'scope3', 'concrete', 'm3', '{m3,kg}')
on conflict do nothing;

-- Factors (illustrative values; replace with authoritative dataset)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('concrete_c20', 'scope3', 'global', 'm3', 'kg', 220.0, 'illustrative', '2024', '2024-01-01'),
  ('concrete_c25', 'scope3', 'global', 'm3', 'kg', 250.0, 'illustrative', '2024', '2024-01-01'),
  ('concrete_c30', 'scope3', 'global', 'm3', 'kg', 280.0, 'illustrative', '2024', '2024-01-01')
on conflict do nothing;

-- Map activities to factors
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on (
  (a.key = 'concrete_c20' and f.category = 'concrete_c20') or
  (a.key = 'concrete_c25' and f.category = 'concrete_c25') or
  (a.key = 'concrete_c30' and f.category = 'concrete_c30')
)
on conflict do nothing;


