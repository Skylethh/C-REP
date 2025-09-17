-- Seed all user-requested construction activities (Turkish-only)
-- Notes:
-- - Where authoritative factors are not available, placeholder emission_factors are added with value=0
-- - For transport (km/ton-km/trip), reuse generic truck factors from 031 to enable immediate use
-- - Default unit chosen to match field practice in the list

-- 1. Proje Öncesi ve Hafriyat İşleri

-- Sondaj Makinesi Yakıtı (Dizel - litre) → reuse diesel_fuel
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('sondaj_makinesi_dizel', 'Sondaj Makinesi Yakıtı (Dizel)', 'energy', 'scope1', 'fuel', 'L', '{L,kg}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = 'fuel' and f.unit_in = 'L'
where a.key = 'sondaj_makinesi_dizel'
on conflict do nothing;

-- Ekskavatör / Dozer / Loder çalışması (saat ve/veya yakıt)
-- Hour-based placeholders (no default factor value)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('ekskavator_saat', 'scope1', 'global', 'h', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('dozer_loader_saat', 'scope1', 'global', 'h', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01')
on conflict do nothing;

insert into activities(key, name, type, scope, category, default_unit, units) values
  ('ekskavator_saat', 'Ekskavatör Çalışması (Saat)', 'energy', 'scope1', 'ekskavator_saat', 'h', '{h}'),
  ('dozer_loader_saat', 'Dozer / Loder Çalışması (Saat)', 'energy', 'scope1', 'dozer_loader_saat', 'h', '{h}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key in ('ekskavator_saat','dozer_loader_saat')
on conflict do nothing;

-- Fuel-based variants reuse diesel fuel
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('ekskavator_dizel', 'Ekskavatör Yakıtı (Dizel)', 'energy', 'scope1', 'fuel', 'L', '{L,kg}'),
  ('dozer_loader_dizel', 'Dozer / Loder Yakıtı (Dizel)', 'energy', 'scope1', 'fuel', 'L', '{L,kg}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = 'fuel' and f.unit_in = 'L'
where a.key in ('ekskavator_dizel','dozer_loader_dizel')
on conflict do nothing;

-- Hafriyat taşınması → reuse truck factors
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('hafriyat_tasinmasi_km', 'Hafriyat Toprağı Taşınması (km)', 'transport', 'scope3', 'truck_avg_km', 'km', '{km}'),
  ('hafriyat_tasinmasi_ton_km', 'Hafriyat Toprağı Taşınması (ton-km)', 'transport', 'scope3', 'truck_avg_ton_km', 'ton_km', '{ton_km}'),
  ('hafriyat_tasinmasi_sefer', 'Hafriyat Toprağı Taşınması (sefer)', 'transport', 'scope3', 'truck_avg_trip', 'trip', '{trip}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key in ('hafriyat_tasinmasi_km','hafriyat_tasinmasi_ton_km','hafriyat_tasinmasi_sefer')
on conflict do nothing;

-- Dolgu malzemesi (agrega/stabilize)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('dolgu_agrega', 'scope3', 'global', 't', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('dolgu_stabilize', 'scope3', 'global', 't', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01')
on conflict do nothing;

insert into activities(key, name, type, scope, category, default_unit, units) values
  ('dolgu_agrega', 'Dolgu Malzemesi (Agrega)', 'materials', 'scope3', 'dolgu_agrega', 't', '{t,kg}'),
  ('dolgu_stabilize', 'Dolgu Malzemesi (Stabilize)', 'materials', 'scope3', 'dolgu_stabilize', 't', '{t,kg}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key in ('dolgu_agrega','dolgu_stabilize')
on conflict do nothing;

-- Dolgu malzemesi nakliyesi → reuse truck
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('dolgu_nakliyesi_km', 'Dolgu Malzemesi Nakliyesi (km)', 'transport', 'scope3', 'truck_avg_km', 'km', '{km}'),
  ('dolgu_nakliyesi_ton_km', 'Dolgu Malzemesi Nakliyesi (ton-km)', 'transport', 'scope3', 'truck_avg_ton_km', 'ton_km', '{ton_km}'),
  ('dolgu_nakliyesi_sefer', 'Dolgu Malzemesi Nakliyesi (sefer)', 'transport', 'scope3', 'truck_avg_trip', 'trip', '{trip}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key in ('dolgu_nakliyesi_km','dolgu_nakliyesi_ton_km','dolgu_nakliyesi_sefer')
on conflict do nothing;

-- 2. Kaba Yapı (Betonarme ve Çelik)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('grobeton_c16_20', 'scope3', 'global', 'm3', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('hazir_beton_c20_25', 'scope3', 'global', 'm3', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('hazir_beton_c25_30', 'scope3', 'global', 'm3', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('hazir_beton_c30_37', 'scope3', 'global', 'm3', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('sap_betonu', 'scope3', 'global', 'm3', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('hasir_celik', 'scope3', 'global', 'kg', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('bitumlu_membran', 'scope3', 'global', 'm2', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('drenaj_levhasi', 'scope3', 'global', 'm2', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01')
on conflict do nothing;

insert into activities(key, name, type, scope, category, default_unit, units) values
  ('grobeton_c16_20', 'Grobeton (C16/20)', 'materials', 'scope3', 'grobeton_c16_20', 'm3', '{m3}'),
  ('hazir_beton_c20_25', 'C20/25 Hazır Beton', 'materials', 'scope3', 'hazir_beton_c20_25', 'm3', '{m3}'),
  ('hazir_beton_c25_30', 'C25/30 Hazır Beton', 'materials', 'scope3', 'hazir_beton_c25_30', 'm3', '{m3}'),
  ('hazir_beton_c30_37', 'C30/37 Hazır Beton', 'materials', 'scope3', 'hazir_beton_c30_37', 'm3', '{m3}'),
  ('sap_betonu', 'Şap Betonu', 'materials', 'scope3', 'sap_betonu', 'm3', '{m3}'),
  ('hasir_celik', 'Hasır Çelik', 'materials', 'scope3', 'hasir_celik', 'kg', '{kg,m2}'),
  ('bitumlu_membran', 'Bitümlü Membran', 'materials', 'scope3', 'bitumlu_membran', 'm2', '{m2}'),
  ('drenaj_levhasi', 'Drenaj Levhası', 'materials', 'scope3', 'drenaj_levhasi', 'm2', '{m2}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key in (
  'grobeton_c16_20','hazir_beton_c20_25','hazir_beton_c25_30','hazir_beton_c30_37','sap_betonu','hasir_celik','bitumlu_membran','drenaj_levhasi'
)
on conflict do nothing;

-- 3. Duvar, Cephe ve İnce Yapı İşleri
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('gazbeton', 'scope3', 'global', 'm3', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('bims_blok', 'scope3', 'global', 'piece', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('cimento_esasli_siva', 'scope3', 'global', 'kg', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('alci_siva', 'scope3', 'global', 'kg', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('duvar_orgu_harci', 'scope3', 'global', 'kg', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('isi_yalitim_eps', 'scope3', 'global', 'm3', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('isi_yalitim_xps', 'scope3', 'global', 'm3', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('cam_yunu', 'scope3', 'global', 'm3', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('su_yalitim_surme', 'scope3', 'global', 'kg', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('duz_cam', 'scope3', 'global', 'm2', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('isicam', 'scope3', 'global', 'm2', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('aluminyum_dograma', 'scope3', 'global', 'kg', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('pvc_dograma', 'scope3', 'global', 'kg', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('ic_cephe_boyasi', 'scope3', 'global', 'L', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('dis_cephe_boyasi', 'scope3', 'global', 'L', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('parke', 'scope3', 'global', 'm2', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01')
on conflict do nothing;

insert into activities(key, name, type, scope, category, default_unit, units) values
  ('gazbeton', 'Gazbeton / Ytong', 'materials', 'scope3', 'gazbeton', 'm3', '{m3}'),
  ('bims_blok', 'Bims Blok', 'materials', 'scope3', 'bims_blok', 'piece', '{piece}'),
  ('cimento_esasli_siva', 'Çimento Esaslı Sıva', 'materials', 'scope3', 'cimento_esasli_siva', 'kg', '{kg}'),
  ('alci_siva', 'Alçı Sıva', 'materials', 'scope3', 'alci_siva', 'kg', '{kg}'),
  ('duvar_orgu_harci', 'Duvar Örgü Harcı', 'materials', 'scope3', 'duvar_orgu_harci', 'kg', '{kg}'),
  ('isi_yalitim_eps', 'Isı Yalıtım Levhası (EPS)', 'materials', 'scope3', 'isi_yalitim_eps', 'm3', '{m3}'),
  ('isi_yalitim_xps', 'Isı Yalıtım Levhası (XPS)', 'materials', 'scope3', 'isi_yalitim_xps', 'm3', '{m3}'),
  ('cam_yunu', 'Cam Yünü', 'materials', 'scope3', 'cam_yunu', 'm3', '{m3}'),
  ('su_yalitim_surme', 'Su Yalıtım Malzemesi (Sürme Esaslı)', 'materials', 'scope3', 'su_yalitim_surme', 'kg', '{kg}'),
  ('duz_cam', 'Düz Cam', 'materials', 'scope3', 'duz_cam', 'm2', '{m2}'),
  ('isicam', 'Isıcam', 'materials', 'scope3', 'isicam', 'm2', '{m2}'),
  ('aluminyum_dograma', 'Alüminyum Doğrama Profili', 'materials', 'scope3', 'aluminyum_dograma', 'kg', '{kg}'),
  ('pvc_dograma', 'PVC Doğrama Profili', 'materials', 'scope3', 'pvc_dograma', 'kg', '{kg}'),
  ('ic_cephe_boyasi', 'İç Cephe Boyası', 'materials', 'scope3', 'ic_cephe_boyasi', 'L', '{L}'),
  ('dis_cephe_boyasi', 'Dış Cephe Boyası', 'materials', 'scope3', 'dis_cephe_boyasi', 'L', '{L}'),
  ('parke', 'Parke / Zemin Kaplaması', 'materials', 'scope3', 'parke', 'm2', '{m2}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key in (
  'gazbeton','bims_blok','cimento_esasli_siva','alci_siva','duvar_orgu_harci','isi_yalitim_eps','isi_yalitim_xps','cam_yunu','su_yalitim_surme','duz_cam','isicam','aluminyum_dograma','pvc_dograma','ic_cephe_boyasi','dis_cephe_boyasi','parke'
)
on conflict do nothing;

-- 4. MEP
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('pprc_boru', 'scope3', 'global', 'm', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('hava_kanali_galvaniz', 'scope3', 'global', 'kg', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('bakir_klima_borusu', 'scope3', 'global', 'm', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('bakir_elektrik_kablosu', 'scope3', 'global', 'm', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('kablo_tavasi', 'scope3', 'global', 'm', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('asansor', 'scope3', 'global', 'piece', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('klima_santrali', 'scope3', 'global', 'piece', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01')
on conflict do nothing;

insert into activities(key, name, type, scope, category, default_unit, units) values
  ('pprc_boru', 'PPRC Temiz Su Borusu', 'materials', 'scope3', 'pprc_boru', 'm', '{m}'),
  ('hava_kanali_galvaniz', 'Galvaniz Sac Hava Kanalı', 'materials', 'scope3', 'hava_kanali_galvaniz', 'kg', '{kg,m2}'),
  ('bakir_klima_borusu', 'Bakır Klima Borusu', 'materials', 'scope3', 'bakir_klima_borusu', 'm', '{m}'),
  ('bakir_elektrik_kablosu', 'Bakır Elektrik Kablosu', 'materials', 'scope3', 'bakir_elektrik_kablosu', 'm', '{m}'),
  ('kablo_tavasi', 'Kablo Tavası', 'materials', 'scope3', 'kablo_tavasi', 'm', '{m}'),
  ('asansor', 'Asansör', 'other', 'scope3', 'asansor', 'piece', '{piece}'),
  ('klima_santrali', 'Klima Santrali / Chiller', 'other', 'scope3', 'klima_santrali', 'piece', '{piece}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key in ('pprc_boru','hava_kanali_galvaniz','bakir_klima_borusu','bakir_elektrik_kablosu','kablo_tavasi','asansor','klima_santrali')
on conflict do nothing;

-- 5. Şantiye Operasyonları ve Lojistik
-- Şebeke Elektrik, Dizel ve Su zaten mevcut; kule vinç için saat bazlı placeholder
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('kule_vinc_saat', 'scope2', 'global', 'h', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01')
on conflict do nothing;

insert into activities(key, name, type, scope, category, default_unit, units) values
  ('kule_vinc_saat', 'Kule Vinç Çalışması (Saat)', 'energy', 'scope2', 'kule_vinc_saat', 'h', '{h}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key = 'kule_vinc_saat'
on conflict do nothing;

-- Malzeme nakliyesi → reuse truck
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('malzeme_nakliyesi_km', 'Malzeme Nakliyesi (km)', 'transport', 'scope3', 'truck_avg_km', 'km', '{km}'),
  ('malzeme_nakliyesi_ton_km', 'Malzeme Nakliyesi (ton-km)', 'transport', 'scope3', 'truck_avg_ton_km', 'ton_km', '{ton_km}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key in ('malzeme_nakliyesi_km','malzeme_nakliyesi_ton_km')
on conflict do nothing;

-- 6. Atık Yönetimi
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('insaat_yikinti_atigi_t', 'scope3', 'global', 't', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('insaat_yikinti_atigi_m3', 'scope3', 'global', 'm3', 'kg', 0, 'seed:placeholder', '2025', '2025-01-01'),
  ('geri_donusulen_metal', 'scope3', 'global', 'kg', 'kg', -1, 'seed:placeholder', '2025', '2025-01-01')
on conflict do nothing;

insert into activities(key, name, type, scope, category, default_unit, units) values
  ('insaat_yikinti_atigi_t', 'İnşaat ve Yıkıntı Atığı (ton)', 'other', 'scope3', 'insaat_yikinti_atigi_t', 't', '{t}'),
  ('insaat_yikinti_atigi_m3', 'İnşaat ve Yıkıntı Atığı (m³)', 'other', 'scope3', 'insaat_yikinti_atigi_m3', 'm3', '{m3}'),
  ('geri_donusulen_metal', 'Geri Dönüştürülen Metal Atığı', 'other', 'scope3', 'geri_donusulen_metal', 'kg', '{kg}')
on conflict do nothing;

insert into activity_factors(activity_id, factor_id)
select a.id, f.id from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.key in ('insaat_yikinti_atigi_t','insaat_yikinti_atigi_m3','geri_donusulen_metal')
on conflict do nothing;
