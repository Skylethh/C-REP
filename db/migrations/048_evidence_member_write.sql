-- Allow project members to upload and delete files in the 'evidence' bucket
-- This replaces the restrictive editor-only policies from 004_storage_policies.sql

-- First, drop the old restrictive policies that limited to editors only
drop policy if exists evidence_insert on storage.objects;
drop policy if exists evidence_delete on storage.objects;

-- Insert policy: members may insert into evidence/{project_id}/...
drop policy if exists evidence_insert_members on storage.objects;
create policy evidence_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidence'
  and is_project_member(extract_project_from_path(name), auth.uid())
);

-- Delete policy: members may delete their project's evidence files
drop policy if exists evidence_delete_members on storage.objects;
create policy evidence_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidence'
  and is_project_member(extract_project_from_path(name), auth.uid())
);
