-- Ensure all activities have Turkish display names (permanent, DB-level)

-- 1) Mapping table for exact key → Turkish name
create table if not exists activity_name_tr (
  key text primary key,
  tr_name text not null
);

-- Seed/extendable mappings (can be safely re-run)
insert into activity_name_tr(key, tr_name) values
  -- Metals / materials
  ('steel_rebar','Nervürlü Çelik'),
  ('steel_structural','Yapısal Çelik'),
  ('aluminium','Alüminyum'),
  ('aluminum','Alüminyum'),
  ('copper','Bakır'),
  ('brass','Pirinç'),
  -- Building materials
  ('cement','Çimento'),
  ('cement_clinker','Çimento Klinker'),
  ('aggregate','Agrega'),
  ('brick','Tuğla'),
  ('brick_clay','Kil Tuğla'),
  ('porcelain_tile','Porselen Karo'),
  ('ceramic_tile','Seramik Karo'),
  ('glass','Cam'),
  ('gypsum_board','Alçıpan'),
  ('paint','Boya'),
  ('paint_acrylic','Boya Akrilik'),
  ('wood_timber','Kereste'),
  ('softwood','Yumuşak Ağaç'),
  ('plywood','Kontrplak'),
  ('plywood_birch','Kontrplak Huş'),
  ('mdf','MDF'),
  ('osb_board','OSB Levha'),
  ('asphalt','Asfalt'),
  ('sand','Kum'),
  -- Utilities / waste
  ('water_supply','Şebeke Suyu'),
  ('waste_mixed','Karma Atık Bertarafı'),
  -- Energy / transport
  ('electricity_grid','Elektrik (şebeke)'),
  ('diesel_fuel','Dizel Yakıt'),
  ('passenger_car','Binek Araç'),
  ('natural_gas','Doğal Gaz'),
  ('gasoline','Benzin'),
  -- Concrete / mixes
  ('concrete','Beton'),
  ('ready_mix_concrete_c35','Hazır Beton C35'),
  ('ready_mix_concrete_c40','Hazır Beton C40'),
  ('concrete_c20','Beton C20'),
  ('concrete_c25','Beton C25'),
  ('concrete_c30','Beton C30'),
  -- Pipes / polymers
  ('pipe_pvc','Boru PVC'),
  ('pipe_hdpe','Boru HDPE'),
  ('pipe_steel','Boru Çelik'),
  ('pvc','PVC'),
  ('hdpe','HDPE'),
  -- Insulation / sealants
  ('rock_wool_insulation','Taş Yünü Yalıtım'),
  ('sealant_silicone','Silikon Mastik')
on conflict (key) do update set tr_name = excluded.tr_name;

-- 2) Token-level Turkishizer for unknown names (best-effort)
create or replace function tr_tokens(name text) returns text
language plpgsql immutable as $$
declare s text := name;
begin
  -- Phrase-first, then single tokens
  s := replace(s, 'Ready Mix Concrete', 'Hazır Beton');
  s := replace(s, 'Concrete', 'Beton');
  s := replace(s, 'Rock Wool', 'Taş Yünü');
  s := replace(s, 'Insulation', 'Yalıtım');
  s := replace(s, 'Sealant', 'Mastik');
  s := replace(s, 'Silicone', 'Silikon');
  s := replace(s, 'Softwood', 'Yumuşak Ağaç');
  s := replace(s, 'Birch', 'Huş');
  s := replace(s, 'Porcelain', 'Porselen');
  s := replace(s, 'Ceramic', 'Seramik');
  s := replace(s, 'Tile', 'Karo');
  s := replace(s, 'Board', 'Levha');
  s := replace(s, 'OSB', 'OSB');
  s := replace(s, 'Plywood', 'Kontrplak');
  s := replace(s, 'Timber', 'Kereste');
  s := replace(s, 'Glass', 'Cam');
  s := replace(s, 'Paint', 'Boya');
  s := replace(s, 'Acrylic', 'Akrilik');
  s := replace(s, 'Steel', 'Çelik');
  s := replace(s, 'Pipe', 'Boru');
  s := replace(s, 'Sand', 'Kum');
  s := replace(s, 'Water', 'Su');
  s := replace(s, 'Supply', 'Şebeke');
  return trim(regexp_replace(s, E'\\s+', ' ', 'g'));
end;
$$;

-- 3) Function to resolve Turkish name by key first, then fallback tokens
create or replace function tr_activity_name(k text, n text) returns text
language plpgsql as $$
declare v text;
begin
  select tr_name into v from activity_name_tr where key = k;
  if v is not null then
    return v;
  end if;
  if n is null or length(trim(n)) = 0 then
    return null;
  end if;
  return tr_tokens(n);
end; $$;

-- 4) Trigger to enforce Turkish names on insert/update
drop trigger if exists trg_activities_tr_name on activities;
create or replace function trg_set_tr_activity_name() returns trigger
language plpgsql as $$
begin
  new.name := coalesce(tr_activity_name(new.key, new.name), new.name);
  return new;
end; $$;

create trigger trg_activities_tr_name
before insert or update on activities
for each row execute function trg_set_tr_activity_name();

-- 5) Backfill existing rows
update activities set name = tr_activity_name(key, name);
