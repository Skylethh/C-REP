-- Fill missing core items and aliases with factors

-- Ensure units used below exist
insert into units(code) values ('m') on conflict do nothing;
insert into units(code) values ('t') on conflict do nothing;
insert into units(code) values ('kWh') on conflict do nothing;

-- Add/ensure electricity factor matching activity category 'electricity'
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('electricity', 'scope2', 'global', 'kWh', 'kg', 0.45, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Aggregate fill (Dolgu Agrega) – category created in 032 with unit_in 't'; provide non-zero factor
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('dolgu_agrega', 'scope3', 'global', 't', 'kg', 10, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Stone wool insulation (Taş Yünü)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('tas_yunu', 'scope3', 'global', 'm3', 'kg', 80, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

insert into activities(key, name, type, scope, category, default_unit, units) values
  ('tas_yunu', 'Taş Yünü (Çatı Şiltesi)', 'materials', 'scope3', 'tas_yunu', 'm3', '{m3}')
on conflict do nothing;

-- Alias: Nervürlü İnşaat Demiri (S420)
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('nervurlu_insaat_demiri_s420', 'Nervürlü İnşaat Demiri (S420)', 'materials', 'scope3', 'steel_rebar', 'kg', '{kg}')
on conflict do nothing;

-- Alias: Kule Vinç Yakıtı (Dizel)
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('kule_vinc_dizel', 'Kule Vinç Yakıtı (Dizel)', 'energy', 'scope1', 'fuel', 'L', '{L,kg}')
on conflict do nothing;

-- Alias: Atıkların Taşınması (km)
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('atik_tasinmasi_km', 'Atıkların Taşınması (km)', 'transport', 'scope3', 'truck_avg_km', 'km', '{km}')
on conflict do nothing;

-- Alias: PVC Atık Su Borusu (m)
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('pvc_atik_su_borusu', 'PVC Atık Su Borusu', 'materials', 'scope3', 'pipe_pvc', 'm', '{m,kg}')
on conflict do nothing;

-- Alias: Çelik Yangın Tesisatı Borusu (m)
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('celik_yangin_tesisati_borusu', 'Çelik Yangın Tesisatı Borusu', 'materials', 'scope3', 'pipe_steel', 'm', '{m,kg}')
on conflict do nothing;

-- Alias: Yapısal Çelik Profil (IPE/HEA)
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('yapisal_celik_profil', 'Yapısal Çelik Profil (IPE/HEA)', 'materials', 'scope3', 'steel_structural', 'kg', '{kg}')
on conflict do nothing;

-- Alias: Plywood Kalıp Malzemesi
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('plywood_kalip_malzemesi', 'Plywood Kalıp Malzemesi', 'materials', 'scope3', 'plywood', 'kg', '{kg}')
on conflict do nothing;

-- Alias: Şantiye Elektrik Tüketimi (Şebeke)
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('santiye_elektrik', 'Şantiye Elektrik Tüketimi (Şebeke)', 'energy', 'scope2', 'electricity', 'kWh', '{kWh}')
on conflict do nothing;

-- Alias: Şantiye Su Tüketimi
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('santiye_su', 'Şantiye Su Tüketimi', 'other', 'scope3', 'water_supply', 'm3', '{m3}')
on conflict do nothing;

-- Map all new/alias activities to the latest matching factor in their category
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key in (
  'tas_yunu','nervurlu_insaat_demiri_s420','kule_vinc_dizel','atik_tasinmasi_km',
  'pvc_atik_su_borusu','celik_yangin_tesisati_borusu','yapisal_celik_profil',
  'plywood_kalip_malzemesi','santiye_elektrik','santiye_su'
)
and f.valid_from = (
  select max(valid_from) from emission_factors f2 where f2.category = f.category and f2.region = f.region
)
on conflict do nothing;
