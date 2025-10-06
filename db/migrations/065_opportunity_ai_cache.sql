-- Cache AI enrichment responses per user/project/opportunity and enforce cooldowns
create table if not exists public.opportunity_ai_enrichments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  opportunity_key text not null,
  base_hash text not null,
  ai_suggestion text not null,
  source_metadata jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, project_id, opportunity_key, base_hash)
);

create index if not exists idx_opportunity_ai_enrichments_user_project
  on public.opportunity_ai_enrichments(user_id, project_id, opportunity_key);

alter table public.opportunity_ai_enrichments enable row level security;

drop policy if exists opportunity_ai_enrichments_sel on public.opportunity_ai_enrichments;
create policy opportunity_ai_enrichments_sel
  on public.opportunity_ai_enrichments
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists opportunity_ai_enrichments_ins on public.opportunity_ai_enrichments;
create policy opportunity_ai_enrichments_ins
  on public.opportunity_ai_enrichments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists opportunity_ai_enrichments_upd on public.opportunity_ai_enrichments;
create policy opportunity_ai_enrichments_upd
  on public.opportunity_ai_enrichments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Track last AI run per opportunity for cooldown enforcement
create table if not exists public.opportunity_ai_runs (
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  opportunity_key text not null,
  last_invoked_at timestamptz not null default now(),
  primary key (user_id, project_id, opportunity_key)
);

alter table public.opportunity_ai_runs enable row level security;

drop policy if exists opportunity_ai_runs_sel on public.opportunity_ai_runs;
create policy opportunity_ai_runs_sel
  on public.opportunity_ai_runs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists opportunity_ai_runs_ins on public.opportunity_ai_runs;
create policy opportunity_ai_runs_ins
  on public.opportunity_ai_runs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists opportunity_ai_runs_upd on public.opportunity_ai_runs;
create policy opportunity_ai_runs_upd
  on public.opportunity_ai_runs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
