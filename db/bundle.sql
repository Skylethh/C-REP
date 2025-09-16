-- 001_init.sql
-- Organizations
create extension if not exists pgcrypto;
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','editor','viewer','billing')),
  created_at timestamptz default now(),
  primary key (organization_id, user_id)
);

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  owner_id uuid not null references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- Entries
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null check (type in ('energy','transport','materials','other')),
  scope text check (scope in ('scope1','scope2','scope3')),
  category text,
  amount numeric not null,
  unit text not null,
  date date not null,
  location text,
  calculation_method text,
  factor_source text,
  factor_version text,
  co2e_value numeric,
  co2e_unit text default 'kg',
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

-- Evidence
create table if not exists evidence_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  entry_id uuid references entries(id) on delete set null,
  file_path text not null,
  mime text not null,
  hash text not null,
  size integer not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  unique(project_id, hash)
);

-- Audit
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  resource text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_project_members_project on project_members(project_id);
create index if not exists idx_project_members_user on project_members(user_id);
create index if not exists idx_entries_project_date on entries(project_id, date);
create index if not exists idx_evidence_project_hash on evidence_files(project_id, hash);

-- Enable RLS
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table entries enable row level security;
alter table evidence_files enable row level security;
alter table audit_logs enable row level security;

-- Policies (simplified blueprint; adjust to your needs)
-- Helper membership checks will be used within policies

drop policy if exists org_select on organizations;
create policy org_select on organizations for select using (
  exists(select 1 from organization_members m where m.organization_id = id and m.user_id = auth.uid())
);

drop policy if exists org_members_select on organization_members;
create policy org_members_select on organization_members for select using (
  user_id = auth.uid() or exists(select 1 from organization_members m where m.organization_id = organization_members.organization_id and m.user_id = auth.uid())
);

drop policy if exists projects_select on projects;
create policy projects_select on projects for select using (
  exists(select 1 from organization_members m where m.organization_id = projects.organization_id and m.user_id = auth.uid())
);
drop policy if exists projects_update on projects;
create policy projects_update on projects for update using (owner_id = auth.uid());
drop policy if exists projects_delete on projects;
create policy projects_delete on projects for delete using (owner_id = auth.uid());

drop policy if exists project_members_select on project_members;
create policy project_members_select on project_members for select using (
  exists(select 1 from project_members pm where pm.project_id = project_members.project_id and pm.user_id = auth.uid())
);

drop policy if exists entries_select on entries;
create policy entries_select on entries for select using (
  exists(select 1 from project_members pm where pm.project_id = entries.project_id and pm.user_id = auth.uid())
);
drop policy if exists entries_modify on entries;
create policy entries_modify on entries for all using (
  exists(select 1 from project_members pm where pm.project_id = entries.project_id and pm.user_id = auth.uid() and pm.role in ('owner','editor'))
);

drop policy if exists evidence_select on evidence_files;
create policy evidence_select on evidence_files for select using (
  exists(select 1 from project_members pm where pm.project_id = evidence_files.project_id and pm.user_id = auth.uid())
);
drop policy if exists evidence_modify on evidence_files;
create policy evidence_modify on evidence_files for all using (
  exists(select 1 from project_members pm where pm.project_id = evidence_files.project_id and pm.user_id = auth.uid() and pm.role in ('owner','editor'))
);




-- 002_rpcs.sql
-- SECURITY DEFINER RPCs

create or replace function create_project(
  p_org uuid,
  p_owner uuid,
  p_name text,
  p_desc text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_project uuid;
begin
  insert into projects(organization_id, name, description, owner_id)
  values (p_org, p_name, p_desc, p_owner)
  returning id into v_project;

  insert into project_members(project_id, user_id, role)
  values (v_project, p_owner, 'owner')
  on conflict do nothing;

  return v_project;
end;$$;

revoke all on function create_project(uuid, uuid, text, text) from public;
grant execute on function create_project(uuid, uuid, text, text) to authenticated;

create or replace function add_member(
  p_project uuid,
  p_actor uuid,
  p_user uuid,
  p_role text
) returns void
language plpgsql
security definer
as $$
declare
  v_owner boolean;
begin
  select exists(
    select 1 from project_members
    where project_id = p_project and user_id = p_actor and role = 'owner'
  ) into v_owner;

  if not v_owner then
    raise exception 'only owner can add members';
  end if;

  insert into project_members(project_id, user_id, role)
  values (p_project, p_user, p_role)
  on conflict (project_id, user_id) do update set role = excluded.role;
end;$$;

revoke all on function add_member(uuid, uuid, uuid, text) from public;
grant execute on function add_member(uuid, uuid, uuid, text) to authenticated;




-- 003_helpers_and_org.sql
-- Create organization with owner membership
create or replace function create_organization(
  p_name text,
  p_owner uuid
) returns uuid
language plpgsql
security definer
as $$
declare
  v_org uuid;
begin
  insert into organizations(name)
  values (p_name)
  returning id into v_org;

  insert into organization_members(organization_id, user_id, role)
  values (v_org, p_owner, 'owner')
  on conflict do nothing;

  return v_org;
end;$$;

revoke all on function create_organization(text, uuid) from public;
grant execute on function create_organization(text, uuid) to authenticated;

-- Membership helper functions
create or replace function is_org_member(p_org uuid, p_user uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from organization_members m
    where m.organization_id = p_org and m.user_id = p_user
  );
$$;

create or replace function is_project_member(p_project uuid, p_user uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from project_members pm
    where pm.project_id = p_project and pm.user_id = p_user
  );
$$;

create or replace function is_project_editor(p_project uuid, p_user uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from project_members pm
    where pm.project_id = p_project and pm.user_id = p_user and pm.role in ('owner','editor')
  );
$$;

-- Extract project uuid from storage path like evidence/{project_uuid}/whatever
create or replace function extract_project_from_path(p_name text)
returns uuid language plpgsql immutable as $$
declare
  part text;
  v_uuid uuid;
begin
  -- name example: evidence/2b7d8a2e-.../file.ext
  part := split_part(p_name, '/', 2);
  begin
    v_uuid := part::uuid;
    return v_uuid;
  exception when others then
    return null;
  end;
end;$$;




-- 004_storage_policies.sql
  -- Create evidence bucket manually in Supabase UI or via CLI:
  -- select storage.create_bucket('evidence', public => false);

  -- Storage policies
  -- Allow project members to read files under evidence/{project_id}/
  drop policy if exists evidence_read on storage.objects;
  create policy evidence_read on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'evidence'
    and is_project_member(extract_project_from_path(name), auth.uid())
  );

  -- Allow editor/owner to insert/delete
  drop policy if exists evidence_insert on storage.objects;
  create policy evidence_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'evidence'
    and is_project_editor(extract_project_from_path(name), auth.uid())
  );

  drop policy if exists evidence_delete on storage.objects;
  create policy evidence_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'evidence'
    and is_project_editor(extract_project_from_path(name), auth.uid())
  );




-- 005_members.sql
-- Find user id by email (SECURITY DEFINER)
create or replace function find_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
as $$
declare v_id uuid; begin
  select id into v_id from auth.users where email = p_email limit 1;
  return v_id;
end;$$;

revoke all on function find_user_id_by_email(text) from public;
grant execute on function find_user_id_by_email(text) to authenticated;

-- Remove member (owner-only)
create or replace function remove_member(
  p_project uuid,
  p_actor uuid,
  p_user uuid
) returns void
language plpgsql
security definer
as $$
declare v_owner boolean; begin
  select exists(
    select 1 from project_members
    where project_id = p_project and user_id = p_actor and role = 'owner'
  ) into v_owner;
  if not v_owner then
    raise exception 'only owner can remove members';
  end if;
  delete from project_members where project_id = p_project and user_id = p_user;
end;$$;

revoke all on function remove_member(uuid, uuid, uuid) from public;
grant execute on function remove_member(uuid, uuid, uuid) to authenticated;




-- 006_calc.sql
-- Calculation schema

create table if not exists units (
  code text primary key
);

create table if not exists unit_conversions (
  from_unit text references units(code) on delete cascade,
  to_unit text references units(code) on delete cascade,
  multiplier numeric not null,
  primary key (from_unit, to_unit)
);

create table if not exists emission_factors (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- energy, transport, materials, other
  scope text, -- scope1/2/3
  region text default 'global',
  unit_in text not null references units(code),
  unit_out text not null references units(code), -- usually kg
  value numeric not null,
  source text,
  version text,
  valid_from date,
  valid_to date
);

create index if not exists idx_factors_category on emission_factors(category);




-- 007_seeds.sql
-- Seed minimal units and conversions
insert into units(code) values
  ('kWh'),
  ('L'),
  ('km'),
  ('kg'),
  ('g')
on conflict do nothing;

insert into unit_conversions(from_unit, to_unit, multiplier) values
  ('g','kg', 0.001),
  ('kg','g', 1000),
  ('kWh','kWh', 1),
  ('L','L', 1),
  ('km','km', 1)
on conflict do nothing;

-- Seed sample emission factors (illustrative; replace with authoritative data)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from)
values
  ('energy','scope2','global','kWh','kg', 0.233, 'DEFRA illustrative', '2024', '2024-01-01'),
  ('transport','scope3','global','km','kg', 0.120, 'Generic passenger car illustrative', '2024', '2024-01-01'),
  ('materials','scope3','global','kg','kg', 1.300, 'Generic paper illustrative', '2024', '2024-01-01')
on conflict do nothing;




-- 008_fix_rls.sql
-- Fix RLS recursion by avoiding self-referential subqueries on the same table

-- organization_members: allow a user to see rows where they are the user
drop policy if exists org_members_select on organization_members;
create policy org_members_select on organization_members for select using (
  user_id = auth.uid()
);

-- projects: select if user is a member of the owning organization via EXISTS
drop policy if exists projects_select on projects;
create policy projects_select on projects for select using (
  exists (
    select 1 from organization_members m
    where m.organization_id = projects.organization_id and m.user_id = auth.uid()
  )
);

-- project_members: allow viewing membership rows for projects the user is part of
drop policy if exists project_members_select on project_members;
create policy project_members_select on project_members for select using (
  exists (
    select 1 from project_members pm2
    where pm2.project_id = project_members.project_id and pm2.user_id = auth.uid()
  )
);




-- 009_invites.sql
-- Invites table
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor','viewer')),
  token uuid not null unique default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz default now(),
  accepted_at timestamptz
);

alter table invites enable row level security;

-- Policy: inviter (project owner) can select their invites; invitee can select by email
drop policy if exists invites_select on invites;
create policy invites_select on invites for select using (
  exists (
    select 1 from project_members pm where pm.project_id = invites.project_id and pm.user_id = auth.uid() and pm.role = 'owner'
  ) or exists (
    select 1 from auth.users u where u.id = auth.uid() and u.email = invites.email
  )
);

-- RPCs
create or replace function create_invite(p_project uuid, p_actor uuid, p_email text, p_role text)
returns uuid
language plpgsql security definer as $$
declare v_is_owner boolean; v_token uuid; begin
  select exists(select 1 from project_members where project_id = p_project and user_id = p_actor and role = 'owner') into v_is_owner;
  if not v_is_owner then raise exception 'only owner can invite'; end if;
  insert into invites(project_id, email, role, inviter_id)
  values (p_project, p_email, p_role, p_actor)
  returning token into v_token;
  return v_token;
end;$$;
revoke all on function create_invite(uuid, uuid, text, text) from public;
grant execute on function create_invite(uuid, uuid, text, text) to authenticated;

create or replace function accept_invite(p_token uuid, p_user uuid)
returns void
language plpgsql security definer as $$
declare v_project uuid; v_role text; begin
  select project_id, role into v_project, v_role from invites where token = p_token and status = 'pending';
  if v_project is null then raise exception 'invalid or used token'; end if;
  insert into project_members(project_id, user_id, role)
  values (v_project, p_user, v_role)
  on conflict (project_id, user_id) do update set role = excluded.role;
  update invites set status = 'accepted', accepted_at = now() where token = p_token;
end;$$;
revoke all on function accept_invite(uuid, uuid) from public;
grant execute on function accept_invite(uuid, uuid) to authenticated;




-- 010_storage_limits.sql
-- Enforce allowed MIME and size via storage policies check expressions are limited;
-- We implement a helper function to validate by extension as a proxy.

create or replace function storage_allowed(p_name text)
returns boolean language plpgsql immutable as $$
declare ext text; begin
  ext := lower(split_part(p_name, '.', 2));
  return ext in ('png','jpg','jpeg','webp','pdf');
end;$$;

-- Update insert policy to include name validation
drop policy if exists evidence_insert on storage.objects;
create policy evidence_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'evidence'
  and storage_allowed(name)
  and is_project_editor(extract_project_from_path(name), auth.uid())
);




-- 011_activity_library.sql
-- Activity / Material Library

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  type text not null check (type in ('energy','transport','materials','other')),
  scope text check (scope in ('scope1','scope2','scope3')),
  category text,
  default_unit text not null,
  units text[] not null default '{}',
  created_at timestamptz default now()
);

alter table activities enable row level security;

drop policy if exists activities_select on activities;
create policy activities_select on activities for select using (true);




-- 012_activity_seeds.sql
-- Seed example activities (expand as needed)
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('electricity_grid', 'Elektrik (şebeke)', 'energy', 'scope2', 'electricity', 'kWh', '{kWh}'),
  ('diesel_fuel', 'Dizel Yakıt', 'energy', 'scope1', 'fuel', 'L', '{L,kg}'),
  ('passenger_car', 'Binek Araç', 'transport', 'scope3', 'vehicle', 'km', '{km}'),
  ('concrete', 'Beton', 'materials', 'scope3', 'construction', 'm3', '{m3,kg}')
on conflict do nothing;




-- 013_entries_activity.sql
alter table entries add column if not exists activity_id uuid references activities(id);
create index if not exists idx_entries_activity on entries(activity_id);




-- 014_activity_factor_map.sql
create table if not exists activity_factors (
  activity_id uuid not null references activities(id) on delete cascade,
  factor_id uuid not null references emission_factors(id) on delete cascade,
  primary key (activity_id, factor_id)
);

alter table activity_factors enable row level security;
drop policy if exists activity_factors_select on activity_factors;
create policy activity_factors_select on activity_factors for select using (true);




-- 015_activity_expand.sql
-- Expand activity library with concrete grades and map to factors

-- Activities
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('concrete_c20', 'Beton C20', 'materials', 'scope3', 'concrete', 'm3', '{m3,kg}'),
  ('concrete_c25', 'Beton C25', 'materials', 'scope3', 'concrete', 'm3', '{m3,kg}'),
  ('concrete_c30', 'Beton C30', 'materials', 'scope3', 'concrete', 'm3', '{m3,kg}')
on conflict do nothing;

-- Factors (illustrative values; replace with authoritative dataset)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('concrete_c20', 'scope3', 'global', 'm3', 'kg', 220.0, 'illustrative', '2024', '2024-01-01'),
  ('concrete_c25', 'scope3', 'global', 'm3', 'kg', 250.0, 'illustrative', '2024', '2024-01-01'),
  ('concrete_c30', 'scope3', 'global', 'm3', 'kg', 280.0, 'illustrative', '2024', '2024-01-01')
on conflict do nothing;

-- Map activities to factors
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on (
  (a.key = 'concrete_c20' and f.category = 'concrete_c20') or
  (a.key = 'concrete_c25' and f.category = 'concrete_c25') or
  (a.key = 'concrete_c30' and f.category = 'concrete_c30')
)
on conflict do nothing;




-- 016_units_extend.sql
-- Ensure volume unit exists for concrete activities
insert into units(code) values ('m3') on conflict do nothing;

-- Align concrete activities to use only m3 (no implicit kg conversion)
update activities set units = '{m3}' where key in ('concrete_c20','concrete_c25','concrete_c30');




-- 017_activity_library_wide.sql
-- Wide activity/material library seeds
-- Note: Values are illustrative placeholders to enable UX; replace with authoritative datasets later

-- Ensure commonly used units exist
insert into units(code) values
  ('kg'), ('m3'), ('kWh'), ('L'), ('km'), ('m2')
on conflict do nothing;

-- Emission factors (global, latest)
-- unit_in is the activity input unit; unit_out is always kg CO2e
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('steel_rebar',       'scope3', 'global', 'kg',  'kg', 1.70, 'seed:illustrative', '2025', '2025-01-01'),
  ('steel_structural',  'scope3', 'global', 'kg',  'kg', 2.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('cement',            'scope3', 'global', 'kg',  'kg', 0.90, 'seed:illustrative', '2025', '2025-01-01'),
  ('aggregate',         'scope3', 'global', 'kg',  'kg', 0.01, 'seed:illustrative', '2025', '2025-01-01'),
  ('brick',             'scope3', 'global', 'kg',  'kg', 0.20, 'seed:illustrative', '2025', '2025-01-01'),
  ('glass',             'scope3', 'global', 'kg',  'kg', 1.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('aluminium',         'scope3', 'global', 'kg',  'kg', 8.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('copper',            'scope3', 'global', 'kg',  'kg', 4.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('pvc',               'scope3', 'global', 'kg',  'kg', 2.50, 'seed:illustrative', '2025', '2025-01-01'),
  ('hdpe',              'scope3', 'global', 'kg',  'kg', 2.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('asphalt',           'scope3', 'global', 'kg',  'kg', 0.06, 'seed:illustrative', '2025', '2025-01-01'),
  ('gypsum_board',      'scope3', 'global', 'kg',  'kg', 0.30, 'seed:illustrative', '2025', '2025-01-01'),
  ('paint',             'scope3', 'global', 'kg',  'kg', 2.00, 'seed:illustrative', '2025', '2025-01-01'),
  ('wood_timber',       'scope3', 'global', 'kg',  'kg', 0.10, 'seed:illustrative', '2025', '2025-01-01'),
  ('plywood',           'scope3', 'global', 'kg',  'kg', 0.50, 'seed:illustrative', '2025', '2025-01-01'),
  ('mdf',               'scope3', 'global', 'kg',  'kg', 0.60, 'seed:illustrative', '2025', '2025-01-01'),
  ('water_supply',      'scope3', 'global', 'm3',  'kg', 0.34, 'seed:illustrative', '2025', '2025-01-01'),
  ('waste_mixed',       'scope3', 'global', 'kg',  'kg', 0.50, 'seed:illustrative', '2025', '2025-01-01'),
  ('natural_gas',       'scope1', 'global', 'm3',  'kg', 1.90, 'seed:illustrative', '2025', '2025-01-01'),
  ('gasoline',          'scope1', 'global', 'L',   'kg', 2.31, 'seed:illustrative', '2025', '2025-01-01')
on conflict do nothing;

-- Activities (materials/energy) with default and allowed units
insert into activities(key, name, type, scope, category, default_unit, units) values
  -- Metals
  ('steel_rebar',      'Çelik Donatı (Rebar)',         'materials', 'scope3', 'steel_rebar',      'kg', '{kg}'),
  ('steel_structural', 'Yapısal Çelik',                'materials', 'scope3', 'steel_structural', 'kg', '{kg}'),
  ('aluminium',        'Alüminyum',                    'materials', 'scope3', 'aluminium',        'kg', '{kg}'),
  ('copper',           'Bakır',                         'materials', 'scope3', 'copper',           'kg', '{kg}'),
  -- Cement/aggregates/bricks/glass
  ('cement',           'Çimento',                       'materials', 'scope3', 'cement',           'kg', '{kg}'),
  ('aggregate',        'Agrega',                        'materials', 'scope3', 'aggregate',        'kg', '{kg}'),
  ('brick',            'Tuğla',                         'materials', 'scope3', 'brick',            'kg', '{kg}'),
  ('glass',            'Cam',                           'materials', 'scope3', 'glass',            'kg', '{kg}'),
  -- Plastics/polymers
  ('pvc',              'PVC',                           'materials', 'scope3', 'pvc',              'kg', '{kg}'),
  ('hdpe',             'HDPE',                          'materials', 'scope3', 'hdpe',             'kg', '{kg}'),
  -- Asphalt/gypsum/paint
  ('asphalt',          'Asfalt',                        'materials', 'scope3', 'asphalt',          'kg', '{kg}'),
  ('gypsum_board',     'Alçıpan',                       'materials', 'scope3', 'gypsum_board',     'kg', '{kg}'),
  ('paint',            'Boya',                          'materials', 'scope3', 'paint',            'kg', '{kg}'),
  -- Wood products
  ('wood_timber',      'Kereste',                       'materials', 'scope3', 'wood_timber',      'kg', '{kg}'),
  ('plywood',          'Kontrplak',                     'materials', 'scope3', 'plywood',          'kg', '{kg}'),
  ('mdf',              'MDF',                           'materials', 'scope3', 'mdf',              'kg', '{kg}'),
  -- Utilities / other
  ('water_supply',     'Şebeke Suyu',                   'other',     'scope3', 'water_supply',     'm3', '{m3}'),
  ('waste_mixed',      'Karma Atık Bertarafı',          'other',     'scope3', 'waste_mixed',      'kg', '{kg}'),
  -- Energy
  ('natural_gas',      'Doğal Gaz',                     'energy',    'scope1', 'natural_gas',      'm3', '{m3}'),
  ('gasoline',         'Benzin',                        'energy',    'scope1', 'gasoline',         'L',  '{L}')
on conflict do nothing;

-- Map activities to corresponding factors by category
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category
on conflict do nothing;




-- 018_indexes.sql
-- Indexes to speed up filters and joins
create index if not exists idx_entries_project_date on entries(project_id, date);
create index if not exists idx_entries_project_type on entries(project_id, type);
create index if not exists idx_entries_project_scope on entries(project_id, scope);
create index if not exists idx_entries_project_category on entries(project_id, category);
create index if not exists idx_evidence_project_entry on evidence_files(project_id, entry_id);




-- 019_search_accents_trgm.sql
-- 1) İndeksleri kaldır
drop index if exists public.idx_activities_name_trgm;
drop index if exists public.idx_activities_type_trgm;

-- 2) Fonksiyonu kaldır
drop function if exists public.immutable_unaccent(text);

-- 3) Doğru fonksiyonu oluştur
create function public.immutable_unaccent(text)
returns text
language sql
immutable
as $$
  select extensions.unaccent($1::text);
$$;

-- 4) İndeksleri yeniden oluştur
create index if not exists idx_activities_name_trgm
  on public.activities using gin ((public.immutable_unaccent(name)) gin_trgm_ops);

create index if not exists idx_activities_type_trgm
  on public.activities using gin ((public.immutable_unaccent(type)) gin_trgm_ops);

-- 020_factors_unique_idx.sql
-- Ensure a unique index for upsert match on emission_factors
-- This satisfies ON CONFLICT (category,region,valid_from)
create unique index if not exists ux_emission_factors_ctx
  on emission_factors (category, region, valid_from);




-- 021_audit_triggers.sql
-- Audit triggers and RLS for audit_logs

-- Function to log row-level changes with project scoping in metadata
create or replace function log_audit_row()
returns trigger
language plpgsql
as $$
declare
  v_user uuid;
  v_project uuid;
  v_meta jsonb;
begin
  -- Determine actor; fallback to created_by if available
  begin
    v_user := auth.uid();
  exception when others then
    v_user := null;
  end;
  if v_user is null then
    v_user := coalesce((NEW).created_by, (OLD).created_by, '00000000-0000-0000-0000-000000000000'::uuid);
  end if;

  -- Project id if present on the row (our target tables have project_id)
  v_project := coalesce((NEW).project_id, (OLD).project_id);

  -- Build metadata with old/new and top-level project_id for RLS filtering
  v_meta := jsonb_build_object(
    'project_id', v_project,
    'old', to_jsonb(OLD),
    'new', to_jsonb(NEW)
  );

  insert into audit_logs(user_id, action, resource, metadata)
  values (v_user, TG_OP, TG_TABLE_NAME, v_meta);

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

-- Triggers for entries, evidence_files, project_members
drop trigger if exists trg_audit_entries_ins on entries;
drop trigger if exists trg_audit_entries_upd on entries;
drop trigger if exists trg_audit_entries_del on entries;
create trigger trg_audit_entries_ins
after insert on entries
for each row execute function log_audit_row();
create trigger trg_audit_entries_upd
after update on entries
for each row execute function log_audit_row();
create trigger trg_audit_entries_del
after delete on entries
for each row execute function log_audit_row();

drop trigger if exists trg_audit_evidence_ins on evidence_files;
drop trigger if exists trg_audit_evidence_upd on evidence_files;
drop trigger if exists trg_audit_evidence_del on evidence_files;
create trigger trg_audit_evidence_ins
after insert on evidence_files
for each row execute function log_audit_row();
create trigger trg_audit_evidence_upd
after update on evidence_files
for each row execute function log_audit_row();
create trigger trg_audit_evidence_del
after delete on evidence_files
for each row execute function log_audit_row();

drop trigger if exists trg_audit_members_ins on project_members;
drop trigger if exists trg_audit_members_upd on project_members;
drop trigger if exists trg_audit_members_del on project_members;
create trigger trg_audit_members_ins
after insert on project_members
for each row execute function log_audit_row();
create trigger trg_audit_members_upd
after update on project_members
for each row execute function log_audit_row();
create trigger trg_audit_members_del
after delete on project_members
for each row execute function log_audit_row();

-- Helpful indexes
create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);
create index if not exists idx_audit_logs_resource_created on audit_logs(resource, created_at desc);

-- RLS policies for audit_logs
-- Allow select only if user is a member of the project referenced by metadata.project_id
drop policy if exists audit_logs_select on audit_logs;
create policy audit_logs_select on audit_logs for select using (
  (metadata ? 'project_id') and
  exists (
    select 1 from project_members pm
    where pm.user_id = auth.uid()
      and pm.project_id = (audit_logs.metadata->>'project_id')::uuid
  )
);




-- 022_org_logo.sql
-- Organization logo support

alter table organizations add column if not exists logo_url text;

-- Create a public bucket for logos (run once in SQL console if needed):
-- select storage.create_bucket('public', public => true);

-- Storage policies for public bucket: allow read to all, write limited to org members via prefix org-<id>/
-- Note: adjust to your security requirements; public read implies logos are publicly accessible by URL.
-- Here we only document; actual policy creation depends on existing global storage RLS setup.




-- 023_favorites.sql
-- Per-user favorites for activities

create table if not exists user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, activity_id)
);

alter table user_favorites enable row level security;

drop policy if exists fav_select on user_favorites;
create policy fav_select on user_favorites for select using (user_id = auth.uid());
drop policy if exists fav_modify on user_favorites;
create policy fav_modify on user_favorites for all using (user_id = auth.uid());




-- 024_construction_core.sql
-- Daily Logs, RFI core tables and RLS

-- Daily logs
create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  date date not null,
  weather text,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists daily_log_entries (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references daily_logs(id) on delete cascade,
  crew_count integer check (crew_count >= 0),
  work_done text,
  equipment_used jsonb,
  location text,
  photos jsonb default '[]'::jsonb, -- array of storage paths
  created_at timestamptz default now()
);

-- RFI (Requests for Information)
create table if not exists rfi (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  photos jsonb default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','answered','closed')),
  to_role text, -- optional routing hint (e.g., 'architect','manager')
  due_date date,
  answer_text text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  answered_at timestamptz
);

-- Indexes
create index if not exists idx_daily_logs_project_date on daily_logs(project_id, date desc);
create index if not exists idx_rfi_project_status on rfi(project_id, status);

-- Enable RLS
alter table daily_logs enable row level security;
alter table daily_log_entries enable row level security;
alter table rfi enable row level security;

-- Policies: members can read; editors/owners can write

-- daily_logs
drop policy if exists daily_logs_select on daily_logs;
create policy daily_logs_select on daily_logs for select using (
  exists(select 1 from project_members pm where pm.project_id = daily_logs.project_id and pm.user_id = auth.uid())
);

drop policy if exists daily_logs_modify on daily_logs;
create policy daily_logs_modify on daily_logs for all using (
  exists(select 1 from project_members pm where pm.project_id = daily_logs.project_id and pm.user_id = auth.uid() and pm.role in ('owner','editor'))
);

-- daily_log_entries inherit via parent log
drop policy if exists daily_log_entries_select on daily_log_entries;
create policy daily_log_entries_select on daily_log_entries for select using (
  exists(select 1 from daily_logs dl join project_members pm on pm.project_id = dl.project_id
         where dl.id = daily_log_entries.log_id and pm.user_id = auth.uid())
);

drop policy if exists daily_log_entries_modify on daily_log_entries;
create policy daily_log_entries_modify on daily_log_entries for all using (
  exists(select 1 from daily_logs dl join project_members pm on pm.project_id = dl.project_id
         where dl.id = daily_log_entries.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor'))
);

-- rfi
drop policy if exists rfi_select on rfi;
create policy rfi_select on rfi for select using (
  exists(select 1 from project_members pm where pm.project_id = rfi.project_id and pm.user_id = auth.uid())
);

drop policy if exists rfi_modify on rfi;
create policy rfi_modify on rfi for all using (
  exists(select 1 from project_members pm where pm.project_id = rfi.project_id and pm.user_id = auth.uid() and pm.role in ('owner','editor'))
);


-- 025_storage_project_files.sql
-- Project files storage bucket and policies
-- Create bucket manually if needed:
-- select storage.create_bucket('project-files', public => false);

-- Read policy for project members
drop policy if exists project_files_read on storage.objects;
create policy project_files_read on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-files'
  and is_project_member(extract_project_from_path(name), auth.uid())
);

-- Insert policy for editors/owners
drop policy if exists project_files_insert on storage.objects;
create policy project_files_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and is_project_editor(extract_project_from_path(name), auth.uid())
);

-- Delete policy for editors/owners
drop policy if exists project_files_delete on storage.objects;
create policy project_files_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and is_project_editor(extract_project_from_path(name), auth.uid())
);


-- 026_rfi_extend_and_rls_fix.sql
-- Fix infinite recursion on project_members select policy by avoiding self-referential subquery
drop policy if exists project_members_select on project_members;
create policy project_members_select on project_members for select using (
  user_id = auth.uid()
);

-- RFI enhancements: sequence, code, requester, references, and messages
alter table rfi add column if not exists seq integer;
alter table rfi add column if not exists code text;
alter table rfi add column if not exists from_party text; -- e.g., Biz, X Taşeronu
alter table rfi add column if not exists reference_text text; -- drawings/spec refs

create table if not exists rfi_messages (
  id uuid primary key default gen_random_uuid(),
  rfi_id uuid not null references rfi(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  message text not null,
  created_at timestamptz default now()
);
alter table rfi_messages enable row level security;

drop policy if exists rfi_messages_select on rfi_messages;
create policy rfi_messages_select on rfi_messages for select using (
  exists (
    select 1 from rfi inner join project_members pm on pm.project_id = rfi.project_id
    where rfi.id = rfi_messages.rfi_id and pm.user_id = auth.uid()
  )
);

drop policy if exists rfi_messages_insert on rfi_messages;
create policy rfi_messages_insert on rfi_messages for insert with check (
  exists (
    select 1 from rfi inner join project_members pm on pm.project_id = rfi.project_id
    where rfi.id = rfi_messages.rfi_id and pm.user_id = auth.uid()
  )
);

-- Auto-number RFI per project via RPC
create or replace function create_rfi(
  p_project uuid,
  p_actor uuid,
  p_title text,
  p_description text,
  p_to_role text,
  p_due_date date,
  p_from_party text,
  p_reference_text text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_seq integer;
  v_code text;
  v_id uuid;
begin
  -- Ensure actor is project member
  if not exists (select 1 from project_members pm where pm.project_id = p_project and pm.user_id = p_actor) then
    raise exception 'not a project member';
  end if;

  -- Next sequence number
  select coalesce(max(seq),0)+1 into v_seq from rfi where project_id = p_project;
  v_code := 'RFI-' || lpad(v_seq::text, 3, '0');

  insert into rfi(project_id, title, description, to_role, due_date, from_party, reference_text, seq, code, created_by)
  values (p_project, p_title, p_description, p_to_role, p_due_date, p_from_party, p_reference_text, v_seq, v_code, p_actor)
  returning id into v_id;

  return v_id;
end;$$;

revoke all on function create_rfi(uuid, uuid, text, text, text, date, text, text) from public;
grant execute on function create_rfi(uuid, uuid, text, text, text, date, text, text) to authenticated;


-- 027_daily_logs_structured.sql
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
