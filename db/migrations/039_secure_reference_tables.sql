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
