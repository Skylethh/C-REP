-- 058_generated_reports.sql
-- Archive table for generated PDF reports with RLS and indexes

create table if not exists generated_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  file_path text not null, -- e.g. project-reports/<project_id>/2025-09-20_123000_Report.pdf
  mime text not null default 'application/pdf',
  size integer,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  period_start date,
  period_end date,
  scope text,   -- optional: scope1|scope2|scope3|all
  type text     -- optional: energy|transport|materials|other|all
);

-- Indexes for fast lookups by project and recency
create index if not exists idx_generated_reports_project on generated_reports(project_id);
create index if not exists idx_generated_reports_created_at on generated_reports(created_at desc);

-- Enable RLS
alter table generated_reports enable row level security;

-- RLS: members of the project can read rows
drop policy if exists generated_reports_select on generated_reports;
create policy generated_reports_select on generated_reports
for select using (
  exists(
    select 1 from project_members pm
    where pm.project_id = generated_reports.project_id and pm.user_id = auth.uid()
  )
);

-- RLS: members can insert their own generated records
-- Note: storage upload policy must also allow insert for members under project-reports bucket
drop policy if exists generated_reports_insert on generated_reports;
create policy generated_reports_insert on generated_reports
for insert with check (
  exists(
    select 1 from project_members pm
    where pm.project_id = generated_reports.project_id and pm.user_id = auth.uid()
  )
);

-- RLS: allow delete by editors/owners OR the creator of the row
drop policy if exists generated_reports_delete on generated_reports;
create policy generated_reports_delete on generated_reports
for delete using (
  exists(
    select 1 from project_members pm
    where pm.project_id = generated_reports.project_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
  or generated_reports.created_by = auth.uid()
);
