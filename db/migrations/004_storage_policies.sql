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


