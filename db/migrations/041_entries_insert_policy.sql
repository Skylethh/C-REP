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
