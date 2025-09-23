-- Create a queue table for large report generation jobs
create table if not exists report_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text,
  date_start date,
  date_end date,
  scope text,
  type text,
  logo_data_url text,
  status text not null default 'pending', -- pending | processing | complete | failed
  error text,
  output_path text, -- storage path after completion
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Simple trigger to update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_report_jobs_updated on report_jobs;
create trigger trg_report_jobs_updated
before update on report_jobs
for each row
execute procedure set_updated_at();

-- RLS: Allow owners and project members to see their jobs
alter table report_jobs enable row level security;

do $$ begin
  create policy report_jobs_select on report_jobs
    for select
    using (
      created_by = auth.uid()
      or exists (
        select 1 from project_members pm
        where pm.project_id = report_jobs.project_id and pm.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy report_jobs_insert on report_jobs
    for insert with check (
      created_by = auth.uid()
      or exists (
        select 1 from project_members pm
        where pm.project_id = report_jobs.project_id and pm.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy report_jobs_update on report_jobs
    for update using (
      created_by = auth.uid()
    );
exception when duplicate_object then null; end $$;
