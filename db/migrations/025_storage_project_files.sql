-- Project files storage bucket and policies
-- Create bucket manually if needed:
-- select storage.create_bucket('project-files', public => false);

-- Read policy for project members
drop policy if exists project_files_read on storage.objects;
create policy project_files_read on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-files'
  and is_project_member(extract_project_from_path(name), auth.uid())
);

-- Insert policy for editors/owners
drop policy if exists project_files_insert on storage.objects;
create policy project_files_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and is_project_editor(extract_project_from_path(name), auth.uid())
);

-- Delete policy for editors/owners
drop policy if exists project_files_delete on storage.objects;
create policy project_files_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and is_project_editor(extract_project_from_path(name), auth.uid())
);
