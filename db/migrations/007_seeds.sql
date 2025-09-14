-- Seed minimal units and conversions
insert into units(code) values
  ('kWh'),
  ('L'),
  ('km'),
  ('kg'),
  ('g')
on conflict do nothing;

insert into unit_conversions(from_unit, to_unit, multiplier) values
  ('g','kg', 0.001),
  ('kg','g', 1000),
  ('kWh','kWh', 1),
  ('L','L', 1),
  ('km','km', 1)
on conflict do nothing;

-- Seed sample emission factors (illustrative; replace with authoritative data)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from)
values
  ('energy','scope2','global','kWh','kg', 0.233, 'DEFRA illustrative', '2024', '2024-01-01'),
  ('transport','scope3','global','km','kg', 0.120, 'Generic passenger car illustrative', '2024', '2024-01-01'),
  ('materials','scope3','global','kg','kg', 1.300, 'Generic paper illustrative', '2024', '2024-01-01')
on conflict do nothing;


