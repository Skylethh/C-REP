-- Add missing factor categories referenced by aliases and activities

-- Ensure base units exist
insert into units(code) values ('kg') on conflict do nothing;
insert into units(code) values ('m3') on conflict do nothing;

-- Structural steel and rebar (illustrative placeholders)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('steel_rebar',       'scope3', 'global', 'kg', 'kg', 1.80, 'seed:basic', '2025', '2025-01-01'),
  ('steel_structural',  'scope3', 'global', 'kg', 'kg', 2.10, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Plywood (generic, align with plywood_birch order of magnitude)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('plywood', 'scope3', 'global', 'kg', 'kg', 0.80, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Water supply (municipal water) per m3
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('water_supply', 'scope3', 'global', 'm3', 'kg', 0.30, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Map any existing activities using these categories to latest factors
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.category in ('steel_rebar','steel_structural','plywood','water_supply')
  and f.valid_from = (
    select max(valid_from) from emission_factors f2 where f2.category = f.category and f2.region = f.region
  )
on conflict do nothing;
