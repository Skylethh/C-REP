-- Add a Turkish-friendly alias activity for rebar (Nervürlü Demir B500)
-- Maps to existing steel_rebar category and factors

insert into activities(key, name, type, scope, category, default_unit, units) values
  ('nervurlu_demir_b500', 'Nervürlü Demir (B500)', 'materials', 'scope3', 'steel_rebar', 'kg', '{kg}')
on conflict do nothing;

-- Map to latest steel_rebar factor
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = 'steel_rebar' and f.region = 'global'
where a.key = 'nervurlu_demir_b500'
  and f.valid_from = (
    select max(valid_from)
    from emission_factors f2
    where f2.category = 'steel_rebar' and f2.region = 'global'
  )
on conflict do nothing;
