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


-- 028_activity_tr_localization.sql
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


-- 028_documents.sql
-- 028_documents.sql
-- Documents and Revisions with RLS and helper RPC

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  code text not null,
  name text not null,
  current_revision integer not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  unique(project_id, code)
);

create table if not exists document_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  rev_no integer not null,
  file_path text not null,
  mime text not null,
  size integer,
  hash text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  unique(document_id, rev_no)
);

-- Indexes
create index if not exists idx_documents_project_code on documents(project_id, code);
create index if not exists idx_docrevs_document_rev on document_revisions(document_id, rev_no desc);
create index if not exists idx_docrevs_created_at on document_revisions(created_at desc);

-- Enable RLS
alter table documents enable row level security;
alter table document_revisions enable row level security;

-- Policies: members can read; editors/owners can write
drop policy if exists documents_select on documents;
create policy documents_select on documents for select using (
  exists (select 1 from project_members pm where pm.project_id = documents.project_id and pm.user_id = auth.uid())
);

drop policy if exists documents_modify on documents;
create policy documents_modify on documents for all using (
  exists (select 1 from project_members pm where pm.project_id = documents.project_id and pm.user_id = auth.uid() and pm.role in ('owner','editor'))
);

drop policy if exists docrevs_select on document_revisions;
create policy docrevs_select on document_revisions for select using (
  exists (
    select 1 from documents d join project_members pm on pm.project_id = d.project_id
    where d.id = document_revisions.document_id and pm.user_id = auth.uid()
  )
);

drop policy if exists docrevs_modify on document_revisions;
create policy docrevs_modify on document_revisions for all using (
  exists (
    select 1 from documents d join project_members pm on pm.project_id = d.project_id
    where d.id = document_revisions.document_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

-- RPC: create or update a document by code, auto-increment rev_no
create or replace function create_or_update_document(
  p_project uuid,
  p_actor uuid,
  p_code text,
  p_name text,
  p_file_path text,
  p_mime text,
  p_size integer,
  p_hash text
) returns uuid
language plpgsql security definer as $$
declare
  v_doc_id uuid;
  v_rev integer;
  v_rev_id uuid;
begin
  -- membership check
  if not exists (select 1 from project_members pm where pm.project_id = p_project and pm.user_id = p_actor) then
    raise exception 'not a project member';
  end if;

  -- upsert document by project+code
  select id into v_doc_id from documents where project_id = p_project and code = p_code limit 1;
  if v_doc_id is null then
    insert into documents(project_id, code, name, created_by)
    values (p_project, p_code, p_name, p_actor)
    returning id into v_doc_id;
  else
    -- optional: keep latest provided name
    update documents set name = p_name where id = v_doc_id and name is distinct from p_name;
  end if;

  -- next revision number
  select coalesce(max(rev_no), 0) + 1 into v_rev from document_revisions where document_id = v_doc_id;

  insert into document_revisions(document_id, rev_no, file_path, mime, size, hash, created_by)
  values (v_doc_id, v_rev, p_file_path, p_mime, p_size, p_hash, p_actor)
  returning id into v_rev_id;

  update documents set current_revision = v_rev where id = v_doc_id;

  return v_rev_id;
end;$$;

revoke all on function create_or_update_document(uuid, uuid, text, text, text, text, integer, text) from public;
grant execute on function create_or_update_document(uuid, uuid, text, text, text, text, integer, text) to authenticated;


-- 029_construction_core_materials.sql
-- Core construction materials (illustrative values); extend/replace with authoritative datasets when available.

-- Factors (global) — unit_out always kg CO2e
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('ready_mix_concrete_c35', 'scope3', 'global', 'm3', 'kg', 320.0, 'seed:construction', '2025', '2025-01-01'),
  ('ready_mix_concrete_c40', 'scope3', 'global', 'm3', 'kg', 350.0, 'seed:construction', '2025', '2025-01-01'),
  ('pipe_pvc',               'scope3', 'global', 'kg', 'kg', 2.7,   'seed:construction', '2025', '2025-01-01'),
  ('pipe_hdpe',              'scope3', 'global', 'kg', 'kg', 2.0,   'seed:construction', '2025', '2025-01-01'),
  ('pipe_steel',             'scope3', 'global', 'kg', 'kg', 2.1,   'seed:construction', '2025', '2025-01-01'),
  ('paint_acrylic',          'scope3', 'global', 'kg', 'kg', 3.5,   'seed:construction', '2025', '2025-01-01'),
  ('rock_wool_insulation',   'scope3', 'global', 'kg', 'kg', 1.2,   'seed:construction', '2025', '2025-01-01'),
  ('sealant_silicone',       'scope3', 'global', 'kg', 'kg', 4.0,   'seed:construction', '2025', '2025-01-01'),
  ('osb_board',              'scope3', 'global', 'kg', 'kg', 0.6,   'seed:construction', '2025', '2025-01-01'),
  ('plywood_birch',          'scope3', 'global', 'kg', 'kg', 0.8,   'seed:construction', '2025', '2025-01-01'),
  ('softwood',               'scope3', 'global', 'kg', 'kg', 0.1,   'seed:construction', '2025', '2025-01-01'),
  ('porcelain_tile',         'scope3', 'global', 'kg', 'kg', 1.1,   'seed:construction', '2025', '2025-01-01'),
  ('ceramic_tile',           'scope3', 'global', 'kg', 'kg', 0.9,   'seed:construction', '2025', '2025-01-01'),
  ('sand',                   'scope3', 'global', 'kg', 'kg', 0.01,  'seed:construction', '2025', '2025-01-01')
on conflict do nothing;

-- Activities (type materials unless noted), default and allowed units
insert into activities(key, name, type, scope, category, default_unit, units) values
  ('ready_mix_concrete_c35', 'Hazır Beton C35',      'materials', 'scope3', 'ready_mix_concrete_c35', 'm3', '{m3}'),
  ('ready_mix_concrete_c40', 'Hazır Beton C40',      'materials', 'scope3', 'ready_mix_concrete_c40', 'm3', '{m3}'),
  ('pipe_pvc',               'Boru PVC',             'materials', 'scope3', 'pipe_pvc',               'kg', '{kg}'),
  ('pipe_hdpe',              'Boru HDPE',            'materials', 'scope3', 'pipe_hdpe',              'kg', '{kg}'),
  ('pipe_steel',             'Boru Çelik',           'materials', 'scope3', 'pipe_steel',             'kg', '{kg}'),
  ('paint_acrylic',          'Boya Akrilik',         'materials', 'scope3', 'paint_acrylic',          'kg', '{kg}'),
  ('rock_wool_insulation',   'Taş Yünü Yalıtım',     'materials', 'scope3', 'rock_wool_insulation',   'kg', '{kg}'),
  ('sealant_silicone',       'Silikon Mastik',       'materials', 'scope3', 'sealant_silicone',       'kg', '{kg}'),
  ('osb_board',              'OSB Levha',            'materials', 'scope3', 'osb_board',              'kg', '{kg}'),
  ('plywood_birch',          'Kontrplak Huş',        'materials', 'scope3', 'plywood_birch',          'kg', '{kg}'),
  ('softwood',               'Yumuşak Ağaç',         'materials', 'scope3', 'softwood',               'kg', '{kg}'),
  ('porcelain_tile',         'Porselen Karo',        'materials', 'scope3', 'porcelain_tile',         'kg', '{kg}'),
  ('ceramic_tile',           'Seramik Karo',         'materials', 'scope3', 'ceramic_tile',           'kg', '{kg}'),
  ('sand',                   'Kum',                  'materials', 'scope3', 'sand',                   'kg', '{kg}')
on conflict do nothing;

-- Map by category
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
on conflict do nothing;


-- 029_documents_notes_and_tools.sql
-- 029_documents_notes_and_tools.sql
-- Add revision note, RPC to set current revision, and helpers for rename/delete

-- Add note column to document_revisions
alter table if exists document_revisions
  add column if not exists note text;

-- Update RPC create_or_update_document to accept p_note and store it
drop function if exists create_or_update_document(uuid, uuid, text, text, text, text, integer, text);
create or replace function create_or_update_document(
  p_project uuid,
  p_actor uuid,
  p_code text,
  p_name text,
  p_file_path text,
  p_mime text,
  p_size integer,
  p_hash text,
  p_note text default null
) returns uuid
language plpgsql security definer as $$
declare
  v_doc_id uuid;
  v_rev integer;
  v_rev_id uuid;
begin
  -- membership check
  if not exists (select 1 from project_members pm where pm.project_id = p_project and pm.user_id = p_actor) then
    raise exception 'not a project member';
  end if;

  -- upsert document by project+code
  select id into v_doc_id from documents where project_id = p_project and code = p_code limit 1;
  if v_doc_id is null then
    insert into documents(project_id, code, name, created_by)
    values (p_project, p_code, p_name, p_actor)
    returning id into v_doc_id;
  else
    -- optional: keep latest provided name
    update documents set name = p_name where id = v_doc_id and name is distinct from p_name;
  end if;

  -- next revision number
  select coalesce(max(rev_no), 0) + 1 into v_rev from document_revisions where document_id = v_doc_id;

  insert into document_revisions(document_id, rev_no, file_path, mime, size, hash, note, created_by)
  values (v_doc_id, v_rev, p_file_path, p_mime, p_size, p_hash, p_note, p_actor)
  returning id into v_rev_id;

  update documents set current_revision = v_rev where id = v_doc_id;

  return v_rev_id;
end;$$;

revoke all on function create_or_update_document(uuid, uuid, text, text, text, text, integer, text, text) from public;
grant execute on function create_or_update_document(uuid, uuid, text, text, text, text, integer, text, text) to authenticated;

-- RPC: set current revision to a specific rev (revert)
create or replace function set_document_current_revision(
  p_document uuid,
  p_rev integer,
  p_actor uuid
) returns void
language plpgsql security definer as $$
declare
  v_project uuid;
begin
  select d.project_id into v_project from documents d where d.id = p_document;
  if v_project is null then
    raise exception 'document not found';
  end if;
  if not exists (
    select 1 from project_members pm where pm.project_id = v_project and pm.user_id = p_actor and pm.role in ('owner','editor')
  ) then
    raise exception 'forbidden';
  end if;
  if not exists (
    select 1 from document_revisions r where r.document_id = p_document and r.rev_no = p_rev
  ) then
    raise exception 'revision not found';
  end if;
  update documents set current_revision = p_rev where id = p_document;
end;$$;

revoke all on function set_document_current_revision(uuid, integer, uuid) from public;
grant execute on function set_document_current_revision(uuid, integer, uuid) to authenticated;


-- 030_units_extend2.sql
-- Extend units to cover construction baseline library
insert into units(code) values
  ('m'),      -- metre
  ('t'),      -- ton
  ('ton_km'), -- ton-km transport work
  ('piece'),  -- adet (generic piece)
  ('trip')    -- sefer (trip)
on conflict do nothing;


-- 031_units_and_transport_extend.sql
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


-- 032_seed_user_listed_activities.sql
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


-- 033_seed_basic_factors.sql
-- Seed non-zero baseline emission factors for common construction items
-- Note: Values are illustrative (ICE/DEFRA-like) placeholders to enable working calculations.
-- Replace with authoritative data as needed.

-- Ensure units exist
insert into units(code) values ('m3') on conflict do nothing;
insert into units(code) values ('m2') on conflict do nothing;
insert into units(code) values ('kg') on conflict do nothing;
insert into units(code) values ('L') on conflict do nothing;

-- CONCRETE (ready-mix by class)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('grobeton_c16_20',     'scope3', 'global', 'm3', 'kg', 200, 'seed:basic', '2025', '2025-01-01'),
  ('hazir_beton_c20_25',  'scope3', 'global', 'm3', 'kg', 220, 'seed:basic', '2025', '2025-01-01'),
  ('hazir_beton_c25_30',  'scope3', 'global', 'm3', 'kg', 250, 'seed:basic', '2025', '2025-01-01'),
  ('hazir_beton_c30_37',  'scope3', 'global', 'm3', 'kg', 280, 'seed:basic', '2025', '2025-01-01'),
  ('sap_betonu',          'scope3', 'global', 'm3', 'kg', 150, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- STEEL / REBAR
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('hasir_celik', 'scope3', 'global', 'kg', 'kg', 1.70, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- MEMBRANES & DRAIN
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('bitumlu_membran', 'scope3', 'global', 'm2', 'kg', 1.0, 'seed:basic', '2025', '2025-01-01'),
  ('drenaj_levhasi',  'scope3', 'global', 'm2', 'kg', 0.8, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- WALL / FINISHES / INSULATION
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('gazbeton',             'scope3', 'global', 'm3', 'kg', 180, 'seed:basic', '2025', '2025-01-01'),
  ('bims_blok',            'scope3', 'global', 'piece', 'kg', 3.0, 'seed:basic', '2025', '2025-01-01'),
  ('cimento_esasli_siva',  'scope3', 'global', 'kg', 'kg', 0.12, 'seed:basic', '2025', '2025-01-01'),
  ('alci_siva',            'scope3', 'global', 'kg', 'kg', 0.25, 'seed:basic', '2025', '2025-01-01'),
  ('duvar_orgu_harci',     'scope3', 'global', 'kg', 'kg', 0.10, 'seed:basic', '2025', '2025-01-01'),
  ('isi_yalitim_eps',      'scope3', 'global', 'm3', 'kg', 80,   'seed:basic', '2025', '2025-01-01'),
  ('isi_yalitim_xps',      'scope3', 'global', 'm3', 'kg', 120,  'seed:basic', '2025', '2025-01-01'),
  ('cam_yunu',             'scope3', 'global', 'm3', 'kg', 60,   'seed:basic', '2025', '2025-01-01'),
  ('duz_cam',              'scope3', 'global', 'm2', 'kg', 12,   'seed:basic', '2025', '2025-01-01'),
  ('isicam',               'scope3', 'global', 'm2', 'kg', 18,   'seed:basic', '2025', '2025-01-01'),
  ('aluminyum_dograma',    'scope3', 'global', 'kg', 'kg', 8.5,  'seed:basic', '2025', '2025-01-01'),
  ('pvc_dograma',          'scope3', 'global', 'kg', 'kg', 2.8,  'seed:basic', '2025', '2025-01-01'),
  ('ic_cephe_boyasi',      'scope3', 'global', 'L',  'kg', 2.2,  'seed:basic', '2025', '2025-01-01'),
  ('dis_cephe_boyasi',     'scope3', 'global', 'L',  'kg', 2.4,  'seed:basic', '2025', '2025-01-01'),
  ('parke',                'scope3', 'global', 'm2', 'kg', 8,    'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- MEP
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('pprc_boru',            'scope3', 'global', 'm',  'kg', 2.6, 'seed:basic', '2025', '2025-01-01'),
  ('hava_kanali_galvaniz', 'scope3', 'global', 'kg', 'kg', 2.2, 'seed:basic', '2025', '2025-01-01'),
  ('bakir_klima_borusu',   'scope3', 'global', 'm',  'kg', 4.4, 'seed:basic', '2025', '2025-01-01'),
  ('bakir_elektrik_kablosu','scope3','global','m',  'kg', 4.0, 'seed:basic', '2025', '2025-01-01'),
  ('kablo_tavasi',         'scope3', 'global', 'm',  'kg', 2.0, 'seed:basic', '2025', '2025-01-01'),
  ('asansor',              'scope3', 'global', 'piece', 'kg', 500, 'seed:basic', '2025', '2025-01-01'),
  ('klima_santrali',       'scope3', 'global', 'piece', 'kg', 1200,'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- SITE OPERATIONS
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('kule_vinc_saat', 'scope2', 'global', 'h', 'kg', 4.0, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- WASTE
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('insaat_yikinti_atigi_t',  'scope3', 'global', 't',  'kg', 15,  'seed:basic', '2025', '2025-01-01'),
  ('insaat_yikinti_atigi_m3', 'scope3', 'global', 'm3', 'kg', 50,  'seed:basic', '2025', '2025-01-01'),
  ('geri_donusulen_metal',    'scope3', 'global', 'kg', 'kg', -1,  'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- FUEL (Diesel in L)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('fuel', 'scope1', 'global', 'L', 'kg', 2.68, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Ensure activities are mapped to latest factors of same category (only for ones inserted above)
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where f.valid_from = (select max(valid_from) from emission_factors f2 where f2.category = f.category and f2.region = f.region)
on conflict do nothing;


-- 034_add_rebar_alias.sql
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


-- 035_fill_missing_core_items.sql
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


-- 036_add_missing_factor_categories.sql
-- Add missing factor categories referenced by aliases and activities

-- Ensure base units exist
insert into units(code) values ('kg') on conflict do nothing;
insert into units(code) values ('m3') on conflict do nothing;

-- Structural steel and rebar (illustrative placeholders)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('steel_rebar',       'scope3', 'global', 'kg', 'kg', 1.80, 'seed:basic', '2025', '2025-01-01'),
  ('steel_structural',  'scope3', 'global', 'kg', 'kg', 2.10, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Plywood (generic, align with plywood_birch order of magnitude)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('plywood', 'scope3', 'global', 'kg', 'kg', 0.80, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Water supply (municipal water) per m3
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('water_supply', 'scope3', 'global', 'm3', 'kg', 0.30, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Map any existing activities using these categories to latest factors
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.category in ('steel_rebar','steel_structural','plywood','water_supply')
  and f.valid_from = (
    select max(valid_from) from emission_factors f2 where f2.category = f.category and f2.region = f.region
  )
on conflict do nothing;


-- 036_fix_placeholder_duplicates.sql
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

-- 037_demote_placeholder_factors.sql
-- Demote placeholder zero-value factors so that real non-zero factors are selected
-- Set their valid_from to an older date, ensuring ORDER BY valid_from DESC picks non-zero ones

update emission_factors
set valid_from = '1900-01-01'
where source = 'seed:placeholder'
  and (valid_from is null or valid_from >= '1900-01-01');

-- Optionally, keep region/category/unit fields as-is; mapping queries will now favor non-zero entries


-- 038_unify_concrete_classes.sql
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


-- 039_secure_reference_tables.sql
-- Secure reference-like tables: allow select for all authenticated, restrict writes via migrations only

-- activities already has RLS select true; keep inserts/updates restricted by backend
-- For emission_factors, restrict to select for everyone; writes come via migrations/admin
alter table emission_factors enable row level security;

drop policy if exists ef_select on emission_factors;
create policy ef_select on emission_factors for select using (true);

drop policy if exists ef_modify on emission_factors;
create policy ef_modify on emission_factors for all using (false);

-- For activity_factors mapping table
alter table activity_factors enable row level security;

drop policy if exists af_select on activity_factors;
create policy af_select on activity_factors for select using (true);

drop policy if exists af_modify on activity_factors;
create policy af_modify on activity_factors for all using (false);


-- 040_set_nonzero_for_placeholders.sql
-- Provide non-zero baseline factors for remaining placeholder categories

-- Machine operation (hour-based) — illustrative placeholders
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('ekskavator_saat',    'scope1', 'global', 'h', 'kg', 25.0, 'seed:basic', '2025', '2025-01-01'),
  ('dozer_loader_saat',  'scope1', 'global', 'h', 'kg', 35.0, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Fill/stabilize aggregate
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('dolgu_stabilize', 'scope3', 'global', 't', 'kg', 12.0, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Brush-on waterproofing (sürme esaslı)
insert into emission_factors(category, scope, region, unit_in, unit_out, value, source, version, valid_from) values
  ('su_yalitim_surme', 'scope3', 'global', 'kg', 'kg', 1.80, 'seed:basic', '2025', '2025-01-01')
on conflict do nothing;

-- Map activities to the latest factors for the updated categories
insert into activity_factors(activity_id, factor_id)
select a.id, f.id
from activities a
join emission_factors f on f.category = a.category and f.region = 'global'
where a.category in ('ekskavator_saat','dozer_loader_saat','dolgu_stabilize','su_yalitim_surme')
  and f.valid_from = (
    select max(valid_from) from emission_factors f2 where f2.category = f.category and f2.region = f.region
  )
on conflict do nothing;


-- 041_entries_insert_policy.sql
-- Allow project editors/owners to INSERT into entries via proper WITH CHECK

-- Dedicated INSERT policy (USING is ignored for INSERT; WITH CHECK is required)
drop policy if exists entries_insert on entries;
create policy entries_insert on entries
  for insert
  with check (
    exists (
      select 1 from project_members pm
      where pm.project_id = entries.project_id
        and pm.user_id = auth.uid()
        and pm.role in ('owner','editor')
    )
  );

-- Optional: ensure UPDATE also has WITH CHECK (so updates don't get blocked)
drop policy if exists entries_update on entries;
create policy entries_update on entries
  for update
  using (
    exists (
      select 1 from project_members pm
      where pm.project_id = entries.project_id
        and pm.user_id = auth.uid()
        and pm.role in ('owner','editor')
    )
  )
  with check (
    exists (
      select 1 from project_members pm
      where pm.project_id = entries.project_id
        and pm.user_id = auth.uid()
        and pm.role in ('owner','editor')
    )
  );


-- 042_project_members_emails.sql
-- Return project members along with their emails (SECURITY DEFINER)
-- Only callable by users who are already members of the project

create or replace function get_project_members(
  p_project uuid
) returns table (
  user_id uuid,
  role text,
  email text
)
language sql
security definer
as $$
  select pm.user_id, pm.role, u.email
  from project_members pm
  join auth.users u on u.id = pm.user_id
  where pm.project_id = p_project
    and exists (
      select 1 from project_members x
      where x.project_id = p_project and x.user_id = auth.uid()
    );
$$;

revoke all on function get_project_members(uuid) from public;
grant execute on function get_project_members(uuid) to authenticated;


-- 043_entries_create_privileged.sql
-- Privileged insert for entries, with explicit membership check
-- Bypasses RLS safely via SECURITY DEFINER

create or replace function create_entry_privileged(
  p_project_id uuid,
  p_user_id uuid,
  p_type text,
  p_date date,
  p_amount numeric,
  p_unit text,
  p_scope text,
  p_category text,
  p_activity_id uuid,
  p_notes text,
  p_co2e_value numeric,
  p_co2e_unit text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_allowed boolean;
  v_id uuid;
begin
  -- Ensure caller is member with owner/editor role
  select exists(
    select 1 from project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = p_user_id
      and pm.role in ('owner','editor')
  ) into v_allowed;

  if not v_allowed then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into entries(
    project_id, type, date, amount, unit, scope, category,
    activity_id, notes, created_by, co2e_value, co2e_unit
  ) values (
    p_project_id, p_type, p_date, p_amount, p_unit, p_scope, p_category,
    p_activity_id, p_notes, p_user_id, p_co2e_value, p_co2e_unit
  ) returning id into v_id;

  return v_id;
end;$$;

revoke all on function create_entry_privileged(
  uuid, uuid, text, date, numeric, text, text, text, uuid, text, numeric, text
) from public;
grant execute on function create_entry_privileged(
  uuid, uuid, text, date, numeric, text, text, text, uuid, text, numeric, text
) to authenticated;


-- 044_entries_update_delete_privileged.sql
-- Privileged functions for updating notes and deleting entries with membership check
create or replace function update_entry_notes_privileged(
  p_user_id uuid,
  p_entry_id uuid,
  p_notes text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ensure user is a member of the project owning the entry
  perform 1
  from entries e
  join project_members m on m.project_id = e.project_id and m.user_id = p_user_id and m.role in ('owner','editor')
  where e.id = p_entry_id;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update entries
  set notes = p_notes
  where id = p_entry_id;
end;
$$;

create or replace function delete_entry_privileged(
  p_user_id uuid,
  p_entry_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ensure user is a member of the project owning the entry
  perform 1
  from entries e
  join project_members m on m.project_id = e.project_id and m.user_id = p_user_id and m.role in ('owner','editor')
  where e.id = p_entry_id;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from entries where id = p_entry_id;
end;
$$;

-- Lock down and grant execute explicitly
revoke all on function update_entry_notes_privileged(uuid, uuid, text) from public;
grant execute on function update_entry_notes_privileged(uuid, uuid, text) to authenticated;

revoke all on function delete_entry_privileged(uuid, uuid) from public;
grant execute on function delete_entry_privileged(uuid, uuid) to authenticated;


-- 045_daily_log_sections_rls_with_check.sql
-- Explicit WITH CHECK policies for INSERT/UPDATE on daily log sections
-- This complements existing "for all using" policies by ensuring new rows pass membership checks.

-- Manpower
drop policy if exists dl_manpower_insert on daily_log_manpower;
create policy dl_manpower_insert on daily_log_manpower for insert with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_manpower.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

drop policy if exists dl_manpower_update on daily_log_manpower;
create policy dl_manpower_update on daily_log_manpower for update using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_manpower.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
) with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_manpower.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

-- Equipment
drop policy if exists dl_equipment_insert on daily_log_equipment;
create policy dl_equipment_insert on daily_log_equipment for insert with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_equipment.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

drop policy if exists dl_equipment_update on daily_log_equipment;
create policy dl_equipment_update on daily_log_equipment for update using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_equipment.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
) with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_equipment.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

-- Materials
drop policy if exists dl_materials_insert on daily_log_materials;
create policy dl_materials_insert on daily_log_materials for insert with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_materials.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

drop policy if exists dl_materials_update on daily_log_materials;
create policy dl_materials_update on daily_log_materials for update using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_materials.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
) with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_materials.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);
