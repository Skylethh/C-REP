-- Core construction materials (illustrative values); extend/replace with authoritative datasets when available.

-- Factors (global) — unit_out always kg CO2e
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('ready_mix_concrete_c35', 'scope3', 'global', 'm3', 'kg', 320.0, 'seed:construction', '2025', '2025-01-01'),
  ('ready_mix_concrete_c40', 'scope3', 'global', 'm3', 'kg', 350.0, 'seed:construction', '2025', '2025-01-01'),
  ('pipe_pvc',               'scope3', 'global', 'kg', 'kg', 2.7,   'seed:construction', '2025', '2025-01-01'),
  ('pipe_hdpe',              'scope3', 'global', 'kg', 'kg', 2.0,   'seed:construction', '2025', '2025-01-01'),
  ('pipe_steel',             'scope3', 'global', 'kg', 'kg', 2.1,   'seed:construction', '2025', '2025-01-01'),
  ('paint_acrylic',          'scope3', 'global', 'kg', 'kg', 3.5,   'seed:construction', '2025', '2025-01-01'),
  ('rock_wool_insulation',   'scope3', 'global', 'kg', 'kg', 1.2,   'seed:construction', '2025', '2025-01-01'),
  ('sealant_silicone',       'scope3', 'global', 'kg', 'kg', 4.0,   'seed:construction', '2025', '2025-01-01'),
  ('osb_board',              'scope3', 'global', 'kg', 'kg', 0.6,   'seed:construction', '2025', '2025-01-01'),
  ('plywood_birch',          'scope3', 'global', 'kg', 'kg', 0.8,   'seed:construction', '2025', '2025-01-01'),
  ('softwood',               'scope3', 'global', 'kg', 'kg', 0.1,   'seed:construction', '2025', '2025-01-01'),
  ('porcelain_tile',         'scope3', 'global', 'kg', 'kg', 1.1,   'seed:construction', '2025', '2025-01-01'),
  ('ceramic_tile',           'scope3', 'global', 'kg', 'kg', 0.9,   'seed:construction', '2025', '2025-01-01'),
  ('sand',                   'scope3', 'global', 'kg', 'kg', 0.01,  'seed:construction', '2025', '2025-01-01')
on conflict do nothing;

-- Activities (type materials unless noted), default and allowed units
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('ready_mix_concrete_c35', 'Hazır Beton C35',      'materials', 'scope3', 'ready_mix_concrete_c35', 'm3', '{m3}'),
  ('ready_mix_concrete_c40', 'Hazır Beton C40',      'materials', 'scope3', 'ready_mix_concrete_c40', 'm3', '{m3}'),
  ('pipe_pvc',               'Boru PVC',             'materials', 'scope3', 'pipe_pvc',               'kg', '{kg}'),
  ('pipe_hdpe',              'Boru HDPE',            'materials', 'scope3', 'pipe_hdpe',              'kg', '{kg}'),
  ('pipe_steel',             'Boru Çelik',           'materials', 'scope3', 'pipe_steel',             'kg', '{kg}'),
  ('paint_acrylic',          'Boya Akrilik',         'materials', 'scope3', 'paint_acrylic',          'kg', '{kg}'),
  ('rock_wool_insulation',   'Taş Yünü Yalıtım',     'materials', 'scope3', 'rock_wool_insulation',   'kg', '{kg}'),
  ('sealant_silicone',       'Silikon Mastik',       'materials', 'scope3', 'sealant_silicone',       'kg', '{kg}'),
  ('osb_board',              'OSB Levha',            'materials', 'scope3', 'osb_board',              'kg', '{kg}'),
  ('plywood_birch',          'Kontrplak Huş',        'materials', 'scope3', 'plywood_birch',          'kg', '{kg}'),
  ('softwood',               'Yumuşak Ağaç',         'materials', 'scope3', 'softwood',               'kg', '{kg}'),
  ('porcelain_tile',         'Porselen Karo',        'materials', 'scope3', 'porcelain_tile',         'kg', '{kg}'),
  ('ceramic_tile',           'Seramik Karo',         'materials', 'scope3', 'ceramic_tile',           'kg', '{kg}'),
  ('sand',                   'Kum',                  'materials', 'scope3', 'sand',                   'kg', '{kg}')
on conflict do nothing;

-- Map by category
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
on conflict do nothing;
