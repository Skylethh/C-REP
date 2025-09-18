-- Preemptively deduplicate placeholder emission_factors to avoid unique conflicts
-- We keep the latest valid_from per (category, region) and remove older duplicates
-- This runs before 037_demote_placeholder_factors.sql so later mass-update won't collide

with dups as (
  select id,
         row_number() over (
           partition by category, region
           order by coalesce(valid_from, date '2100-01-01') desc, id
         ) as rn
  from emission_factors
  where source = 'seed:placeholder'
)
delete from emission_factors ef
using dups
where ef.id = dups.id
  and dups.rn > 1;