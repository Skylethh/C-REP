-- Create table for per-user dismissed opportunities
create table if not exists public.dismissed_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  rule_id text not null,
  opportunity_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, project_id, opportunity_key)
);

alter table public.dismissed_opportunities enable row level security;

-- Note: CREATE POLICY does not support IF NOT EXISTS; use DROP ... IF EXISTS first for idempotency
drop policy if exists dismissed_opportunities_ins on public.dismissed_opportunities;
create policy dismissed_opportunities_ins
  on public.dismissed_opportunities
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists dismissed_opportunities_sel on public.dismissed_opportunities;
create policy dismissed_opportunities_sel
  on public.dismissed_opportunities
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists dismissed_opportunities_del on public.dismissed_opportunities;
create policy dismissed_opportunities_del
  on public.dismissed_opportunities
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Helpful index for filtering
create index if not exists idx_dismissed_opportunities_user_project
  on public.dismissed_opportunities(user_id, project_id);
