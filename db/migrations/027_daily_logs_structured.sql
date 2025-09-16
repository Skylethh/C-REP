-- 027_daily_logs_structured.sql
-- Extend daily logs with structured fields and add related tables (manpower, equipment, materials)

-- Add structured weather and summary fields + photos to daily_logs
alter table daily_logs add column if not exists temp_min_c integer;
alter table daily_logs add column if not exists temp_max_c integer;
alter table daily_logs add column if not exists precipitation text check (precipitation in ('none','light_rain','heavy_rain','snow'));
alter table daily_logs add column if not exists wind text check (wind in ('calm','moderate','strong'));
alter table daily_logs add column if not exists work_summary text;
alter table daily_logs add column if not exists photos jsonb default '[]'::jsonb;

-- Manpower entries per daily log
create table if not exists daily_log_manpower (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references daily_logs(id) on delete cascade,
  contractor text,
  trade text,
  person_count integer not null check (person_count >= 0),
  created_at timestamptz default now()
);

-- Equipment usage per daily log
create table if not exists daily_log_equipment (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references daily_logs(id) on delete cascade,
  equipment_name text not null,
  hours numeric not null check (hours >= 0),
  created_at timestamptz default now()
);

-- Materials delivered per daily log, linked to activity library
create table if not exists daily_log_materials (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references daily_logs(id) on delete cascade,
  activity_id uuid not null references activities(id),
  quantity numeric not null check (quantity >= 0),
  unit text not null,
  photos jsonb default '[]'::jsonb, -- delivery note or related photos
  created_at timestamptz default now()
);

-- Enable RLS on new tables
alter table daily_log_manpower enable row level security;
alter table daily_log_equipment enable row level security;
alter table daily_log_materials enable row level security;

-- Policies: members can read; editors/owners can write via parent log's project membership
drop policy if exists dl_manpower_select on daily_log_manpower;
create policy dl_manpower_select on daily_log_manpower for select using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_manpower.log_id and pm.user_id = auth.uid()
  )
);

drop policy if exists dl_manpower_modify on daily_log_manpower;
create policy dl_manpower_modify on daily_log_manpower for all using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_manpower.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

drop policy if exists dl_equipment_select on daily_log_equipment;
create policy dl_equipment_select on daily_log_equipment for select using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_equipment.log_id and pm.user_id = auth.uid()
  )
);

drop policy if exists dl_equipment_modify on daily_log_equipment;
create policy dl_equipment_modify on daily_log_equipment for all using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_equipment.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

drop policy if exists dl_materials_select on daily_log_materials;
create policy dl_materials_select on daily_log_materials for select using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_materials.log_id and pm.user_id = auth.uid()
  )
);

drop policy if exists dl_materials_modify on daily_log_materials;
create policy dl_materials_modify on daily_log_materials for all using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_materials.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

-- Helpful indexes
create index if not exists idx_dl_manpower_log on daily_log_manpower(log_id, created_at desc);
create index if not exists idx_dl_equipment_log on daily_log_equipment(log_id, created_at desc);
create index if not exists idx_dl_materials_log on daily_log_materials(log_id, created_at desc);
