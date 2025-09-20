-- Allow project members to upload files specifically under RFI paths
-- Bucket: project-files
-- Path pattern: .../rfi/... (works whether name includes 'project-files/' prefix or not)

drop policy if exists project_files_insert_rfi on storage.objects;
create policy project_files_insert_rfi on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and position('/rfi/' in name) > 0
  and is_project_member(extract_project_from_path(name), auth.uid())
);

-- Note: Existing 'project_files_insert' policy (editor-only) remains for other paths.