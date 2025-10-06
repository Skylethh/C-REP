-- Provide non-zero baseline emission factors for heavy equipment and fill activities.
-- Ensures users no longer see "Uygun emisyon faktörü bulunamadı" for common site operations.

insert into emission_factors (category, scope, region, unit_in, unit_out, value, source, version, valid_from)
values
  ('kule_vinc_saat',    'scope2', 'global', 'h', 'kg', 4.0,   'seed:basic', '2025', '2025-01-01'),
  ('ekskavator_saat',   'scope1', 'global', 'h', 'kg', 25.0,  'seed:basic', '2025', '2025-01-01'),
  ('dozer_loader_saat', 'scope1', 'global', 'h', 'kg', 35.0,  'seed:basic', '2025', '2025-01-01'),
  ('dolgu_agrega',      'scope3', 'global', 't', 'kg', 10.0,  'seed:basic', '2025', '2025-01-01'),
  ('dolgu_stabilize',   'scope3', 'global', 't', 'kg', 12.0,  'seed:basic', '2025', '2025-01-01'),
  ('su_yalitim_surme',  'scope3', 'global', 'kg', 'kg', 1.80, 'seed:basic', '2025', '2025-01-01')
on conflict (category, region, valid_from)
do update set
  scope = excluded.scope,
  unit_in = excluded.unit_in,
  unit_out = excluded.unit_out,
  value = excluded.value,
  source = excluded.source,
  version = excluded.version;
