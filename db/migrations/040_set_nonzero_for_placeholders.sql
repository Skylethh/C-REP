-- Provide non-zero baseline factors for remaining placeholder categories

-- Machine operation (hour-based) — illustrative placeholders
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('ekskavator_saat',    'scope1', 'global', 'h', 'kg', 25.0, 'seed:basic', '2025', '2025-01-01'),
  ('dozer_loader_saat',  'scope1', 'global', 'h', 'kg', 35.0, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Fill/stabilize aggregate
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('dolgu_stabilize', 'scope3', 'global', 't', 'kg', 12.0, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Brush-on waterproofing (sürme esaslı)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('su_yalitim_surme', 'scope3', 'global', 'kg', 'kg', 1.80, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Map activities to the latest factors for the updated categories
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.category in ('ekskavator_saat','dozer_loader_saat','dolgu_stabilize','su_yalitim_surme')
  and f.valid_from = (
    select max(valid_from) from emission_factors f2 where f2.category = f.category and f2.region = f.region
  )
on conflict do nothing;
