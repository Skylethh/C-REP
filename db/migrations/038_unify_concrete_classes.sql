-- Unify concrete classes into canonical categories and remap factors

-- 1) Ensure canonical categories exist with non-zero factors
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from)
select * from (
  values
    ('concrete_c20_25','scope3','global','m3','kg', 220.0, 'seed:unify', '2025', '2025-01-01'::date),
    ('concrete_c25_30','scope3','global','m3','kg', 250.0, 'seed:unify', '2025', '2025-01-01'::date),
    ('concrete_c30_37','scope3','global','m3','kg', 280.0, 'seed:unify', '2025', '2025-01-01'::date)
) as v(category, scope, region, unit_in, unit_out, value, source, version, valid_from)
on conflict do nothing;

-- 2) Point existing activities to canonical categories (keep their keys for now)
update activities set category = 'concrete_c20_25'
where key in ('hazir_beton_c20_25','concrete_c20');

update activities set category = 'concrete_c25_30'
where key in ('hazir_beton_c25_30','concrete_c25');

update activities set category = 'concrete_c30_37'
where key in ('hazir_beton_c30_37','concrete_c30');

-- 3) Remap activity_factors to latest factor in the canonical category
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.category in ('concrete_c20_25','concrete_c25_30','concrete_c30_37')
  and f.valid_from = (
    select max(valid_from) from emission_factors f2 where f2.category = f.category and f2.region = f.region
  )
on conflict do nothing;

-- 4) Clean up duplicate factor categories (optional but reduces clutter)
-- First, delete any mapping rows that reference old duplicate categories to avoid FK issues
delete from activity_factors af
using emission_factors ef
where af.factor_id = ef.id
  and ef.category in ('hazir_beton_c20_25','hazir_beton_c25_30','hazir_beton_c30_37','concrete_c20','concrete_c25','concrete_c30');

-- Then remove the old emission factor rows
delete from emission_factors
where category in ('hazir_beton_c20_25','hazir_beton_c25_30','hazir_beton_c30_37','concrete_c20','concrete_c25','concrete_c30');
