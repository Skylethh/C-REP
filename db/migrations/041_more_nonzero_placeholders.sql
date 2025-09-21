-- Provide non-zero baseline for additional placeholder-only categories

-- Fill aggregate (dolgu_agrega) — illustrative placeholder value
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('dolgu_agrega', 'scope3', 'global', 't', 'kg', 10.0, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Map activities to the latest factor for the updated category
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.category in ('dolgu_agrega')
  and f.valid_from = (
    select max(valid_from) from emission_factors f2 where f2.category = f.category and f2.region = f.region
  )
on conflict do nothing;
