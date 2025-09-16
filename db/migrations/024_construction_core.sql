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
