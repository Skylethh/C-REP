-- Seed non-zero baseline emission factors for common construction items
-- Note: Values are illustrative (ICE/DEFRA-like) placeholders to enable working calculations.
-- Replace with authoritative data as needed.

-- Ensure units exist
insert into units(code) values ('m3') on conflict do nothing;
insert into units(code) values ('m2') on conflict do nothing;
insert into units(code) values ('kg') on conflict do nothing;
insert into units(code) values ('L') on conflict do nothing;

-- CONCRETE (ready-mix by class)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('grobeton_c16_20',     'scope3', 'global', 'm3', 'kg', 200, 'seed:basic', '2025', '2025-01-01'),
  ('hazir_beton_c20_25',  'scope3', 'global', 'm3', 'kg', 220, 'seed:basic', '2025', '2025-01-01'),
  ('hazir_beton_c25_30',  'scope3', 'global', 'm3', 'kg', 250, 'seed:basic', '2025', '2025-01-01'),
  ('hazir_beton_c30_37',  'scope3', 'global', 'm3', 'kg', 280, 'seed:basic', '2025', '2025-01-01'),
  ('sap_betonu',          'scope3', 'global', 'm3', 'kg', 150, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- STEEL / REBAR
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('hasir_celik', 'scope3', 'global', 'kg', 'kg', 1.70, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- MEMBRANES & DRAIN
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('bitumlu_membran', 'scope3', 'global', 'm2', 'kg', 1.0, 'seed:basic', '2025', '2025-01-01'),
  ('drenaj_levhasi',  'scope3', 'global', 'm2', 'kg', 0.8, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- WALL / FINISHES / INSULATION
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('gazbeton',             'scope3', 'global', 'm3', 'kg', 180, 'seed:basic', '2025', '2025-01-01'),
  ('bims_blok',            'scope3', 'global', 'piece', 'kg', 3.0, 'seed:basic', '2025', '2025-01-01'),
  ('cimento_esasli_siva',  'scope3', 'global', 'kg', 'kg', 0.12, 'seed:basic', '2025', '2025-01-01'),
  ('alci_siva',            'scope3', 'global', 'kg', 'kg', 0.25, 'seed:basic', '2025', '2025-01-01'),
  ('duvar_orgu_harci',     'scope3', 'global', 'kg', 'kg', 0.10, 'seed:basic', '2025', '2025-01-01'),
  ('isi_yalitim_eps',      'scope3', 'global', 'm3', 'kg', 80,   'seed:basic', '2025', '2025-01-01'),
  ('isi_yalitim_xps',      'scope3', 'global', 'm3', 'kg', 120,  'seed:basic', '2025', '2025-01-01'),
  ('cam_yunu',             'scope3', 'global', 'm3', 'kg', 60,   'seed:basic', '2025', '2025-01-01'),
  ('duz_cam',              'scope3', 'global', 'm2', 'kg', 12,   'seed:basic', '2025', '2025-01-01'),
  ('isicam',               'scope3', 'global', 'm2', 'kg', 18,   'seed:basic', '2025', '2025-01-01'),
  ('aluminyum_dograma',    'scope3', 'global', 'kg', 'kg', 8.5,  'seed:basic', '2025', '2025-01-01'),
  ('pvc_dograma',          'scope3', 'global', 'kg', 'kg', 2.8,  'seed:basic', '2025', '2025-01-01'),
  ('ic_cephe_boyasi',      'scope3', 'global', 'L',  'kg', 2.2,  'seed:basic', '2025', '2025-01-01'),
  ('dis_cephe_boyasi',     'scope3', 'global', 'L',  'kg', 2.4,  'seed:basic', '2025', '2025-01-01'),
  ('parke',                'scope3', 'global', 'm2', 'kg', 8,    'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- MEP
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('pprc_boru',            'scope3', 'global', 'm',  'kg', 2.6, 'seed:basic', '2025', '2025-01-01'),
  ('hava_kanali_galvaniz', 'scope3', 'global', 'kg', 'kg', 2.2, 'seed:basic', '2025', '2025-01-01'),
  ('bakir_klima_borusu',   'scope3', 'global', 'm',  'kg', 4.4, 'seed:basic', '2025', '2025-01-01'),
  ('bakir_elektrik_kablosu','scope3','global','m',  'kg', 4.0, 'seed:basic', '2025', '2025-01-01'),
  ('kablo_tavasi',         'scope3', 'global', 'm',  'kg', 2.0, 'seed:basic', '2025', '2025-01-01'),
  ('asansor',              'scope3', 'global', 'piece', 'kg', 500, 'seed:basic', '2025', '2025-01-01'),
  ('klima_santrali',       'scope3', 'global', 'piece', 'kg', 1200,'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- SITE OPERATIONS
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('kule_vinc_saat', 'scope2', 'global', 'h', 'kg', 4.0, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- WASTE
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('insaat_yikinti_atigi_t',  'scope3', 'global', 't',  'kg', 15,  'seed:basic', '2025', '2025-01-01'),
  ('insaat_yikinti_atigi_m3', 'scope3', 'global', 'm3', 'kg', 50,  'seed:basic', '2025', '2025-01-01'),
  ('geri_donusulen_metal',    'scope3', 'global', 'kg', 'kg', -1,  'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- FUEL (Diesel in L)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('fuel', 'scope1', 'global', 'L', 'kg', 2.68, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Ensure activities are mapped to latest factors of same category (only for ones inserted above)
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where f.valid_from = (select max(valid_from) from emission_factors f2 where f2.category = f.category and f2.region = f.region)
on conflict do nothing;
