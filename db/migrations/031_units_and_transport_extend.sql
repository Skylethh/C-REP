-- Extend units and seeds to cover construction operations comprehensively

-- Add hour unit
insert into units(code) values ('h') on conflict do nothing;

-- Ensure ton unit exists (added in 030, but safe)
insert into units(code) values ('t') on conflict do nothing;

-- Unit conversions for kg <-> t
insert into unit_conversions(from_unit, to_unit, multiplier) values
  ('kg','t', 0.001),
  ('t','kg', 1000)
on conflict do nothing;

-- Widen units for selected existing activities to support field entry in native units
-- Note: activities.units is a text[]; use array operations to add if missing
update activities set units = (select array(select distinct unnest(units || '{piece}'))) where key = 'brick';
update activities set units = (select array(select distinct unnest(units || '{m2}'))) where key in ('gypsum_board','glass','ceramic_tile');
update activities set units = (select array(select distinct unnest(units || '{m}'))) where key in ('pipe_pvc','pipe_hdpe','pipe_steel');
update activities set units = (select array(select distinct unnest(units || '{L}'))) where key in ('paint','paint_acrylic','diesel_fuel');

-- Generic truck transport activities (illustrative; replace with authoritative fleet factors)
-- km-based average truck (no payload normalization) and ton-km work, plus trip-based placeholder
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('truck_avg_km',     'scope3', 'global', 'km',      'kg', 0.9,   'seed:transport', '2025', '2025-01-01'),
  ('truck_avg_ton_km', 'scope3', 'global', 'ton_km',  'kg', 0.12,  'seed:transport', '2025', '2025-01-01'),
  ('truck_avg_trip',   'scope3', 'global', 'trip',    'kg', 10.0,  'seed:transport', '2025', '2025-01-01')
on conflict do nothing;

insert into activities(key, name, type, scope, category, default_unit, units) values
  ('truck_avg_km',      'Ortalama Kamyon (km)',        'transport', 'scope3', 'truck_avg_km',     'km', '{km}'),
  ('truck_avg_ton_km',  'Ortalama Kamyon (ton-km)',    'transport', 'scope3', 'truck_avg_ton_km', 'ton_km', '{ton_km}'),
  ('truck_avg_trip',    'Ortalama Kamyon (sefer)',     'transport', 'scope3', 'truck_avg_trip',   'trip', '{trip}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key in ('truck_avg_km','truck_avg_ton_km','truck_avg_trip')
on conflict do nothing;
