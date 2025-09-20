-- Fix project-files bucket policies to allow members to upload/delete 
-- This replaces the restrictive editor-only policies from 025_storage_project_files.sql

-- First, drop the old restrictive policies that limited to editors only
drop policy if exists project_files_insert on storage.objects;
drop policy if exists project_files_delete on storage.objects;

-- Insert policy: members may insert into project-files/{project_id}/...
create policy project_files_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and is_project_member(extract_project_from_path(name), auth.uid())
);

-- Delete policy: members may delete their project's files
create policy project_files_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and is_project_member(extract_project_from_path(name), auth.uid())
);