-- Wide activity/material library seeds
-- Note: Values are illustrative placeholders to enable UX; replace with authoritative datasets later

-- Ensure commonly used units exist
insert into units(code) values
  ('kg'), ('m3'), ('kWh'), ('L'), ('km'), ('m2')
on conflict do nothing;

-- Emission factors (global, latest)
-- unit_in is the activity input unit; unit_out is always kg CO2e
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('steel_rebar',       'scope3', 'global', 'kg',  'kg', 1.70, 'seed:illustrative', '2025', '2025-01-01'),
  ('steel_structural',  'scope3', 'global', 'kg',  'kg', 2.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('cement',            'scope3', 'global', 'kg',  'kg', 0.90, 'seed:illustrative', '2025', '2025-01-01'),
  ('aggregate',         'scope3', 'global', 'kg',  'kg', 0.01, 'seed:illustrative', '2025', '2025-01-01'),
  ('brick',             'scope3', 'global', 'kg',  'kg', 0.20, 'seed:illustrative', '2025', '2025-01-01'),
  ('glass',             'scope3', 'global', 'kg',  'kg', 1.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('aluminium',         'scope3', 'global', 'kg',  'kg', 8.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('copper',            'scope3', 'global', 'kg',  'kg', 4.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('pvc',               'scope3', 'global', 'kg',  'kg', 2.50, 'seed:illustrative', '2025', '2025-01-01'),
  ('hdpe',              'scope3', 'global', 'kg',  'kg', 2.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('asphalt',           'scope3', 'global', 'kg',  'kg', 0.06, 'seed:illustrative', '2025', '2025-01-01'),
  ('gypsum_board',      'scope3', 'global', 'kg',  'kg', 0.30, 'seed:illustrative', '2025', '2025-01-01'),
  ('paint',             'scope3', 'global', 'kg',  'kg', 2.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('wood_timber',       'scope3', 'global', 'kg',  'kg', 0.10, 'seed:illustrative', '2025', '2025-01-01'),
  ('plywood',           'scope3', 'global', 'kg',  'kg', 0.50, 'seed:illustrative', '2025', '2025-01-01'),
  ('mdf',               'scope3', 'global', 'kg',  'kg', 0.60, 'seed:illustrative', '2025', '2025-01-01'),
  ('water_supply',      'scope3', 'global', 'm3',  'kg', 0.34, 'seed:illustrative', '2025', '2025-01-01'),
  ('waste_mixed',       'scope3', 'global', 'kg',  'kg', 0.50, 'seed:illustrative', '2025', '2025-01-01'),
  ('natural_gas',       'scope1', 'global', 'm3',  'kg', 1.90, 'seed:illustrative', '2025', '2025-01-01'),
  ('gasoline',          'scope1', 'global', 'L',   'kg', 2.31, 'seed:illustrative', '2025', '2025-01-01')
on conflict do nothing;

-- Activities (materials/energy) with default and allowed units
insert into activities(key, name, type, scope, category, default_unit, units) values
  -- Metals
  ('steel_rebar',      'Çelik Donatı (Rebar)',         'materials', 'scope3', 'steel_rebar',      'kg', '{kg}'),
  ('steel_structural', 'Yapısal Çelik',                'materials', 'scope3', 'steel_structural', 'kg', '{kg}'),
  ('aluminium',        'Alüminyum',                    'materials', 'scope3', 'aluminium',        'kg', '{kg}'),
  ('copper',           'Bakır',                         'materials', 'scope3', 'copper',           'kg', '{kg}'),
  -- Cement/aggregates/bricks/glass
  ('cement',           'Çimento',                       'materials', 'scope3', 'cement',           'kg', '{kg}'),
  ('aggregate',        'Agrega',                        'materials', 'scope3', 'aggregate',        'kg', '{kg}'),
  ('brick',            'Tuğla',                         'materials', 'scope3', 'brick',            'kg', '{kg}'),
  ('glass',            'Cam',                           'materials', 'scope3', 'glass',            'kg', '{kg}'),
  -- Plastics/polymers
  ('pvc',              'PVC',                           'materials', 'scope3', 'pvc',              'kg', '{kg}'),
  ('hdpe',             'HDPE',                          'materials', 'scope3', 'hdpe',             'kg', '{kg}'),
  -- Asphalt/gypsum/paint
  ('asphalt',          'Asfalt',                        'materials', 'scope3', 'asphalt',          'kg', '{kg}'),
  ('gypsum_board',     'Alçıpan',                       'materials', 'scope3', 'gypsum_board',     'kg', '{kg}'),
  ('paint',            'Boya',                          'materials', 'scope3', 'paint',            'kg', '{kg}'),
  -- Wood products
  ('wood_timber',      'Kereste',                       'materials', 'scope3', 'wood_timber',      'kg', '{kg}'),
  ('plywood',          'Kontrplak',                     'materials', 'scope3', 'plywood',          'kg', '{kg}'),
  ('mdf',              'MDF',                           'materials', 'scope3', 'mdf',              'kg', '{kg}'),
  -- Utilities / other
  ('water_supply',     'Şebeke Suyu',                   'other',     'scope3', 'water_supply',     'm3', '{m3}'),
  ('waste_mixed',      'Karma Atık Bertarafı',          'other',     'scope3', 'waste_mixed',      'kg', '{kg}'),
  -- Energy
  ('natural_gas',      'Doğal Gaz',                     'energy',    'scope1', 'natural_gas',      'm3', '{m3}'),
  ('gasoline',         'Benzin',                        'energy',    'scope1', 'gasoline',         'L',  '{L}')
on conflict do nothing;

-- Map activities to corresponding factors by category
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category
on conflict do nothing;


