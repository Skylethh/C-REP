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


