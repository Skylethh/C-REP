-- Ensure required storage buckets exist and adjust policies for daily logs
-- Context: Users see "Bucket not found" when uploading photos (RFI, Daily Logs, etc.)
-- This migration creates missing buckets and allows project members to upload/delete
-- photos under project-files/{project_id}/daily-logs/...

-- 1) Create buckets if they don't exist (fallback to direct insert if create_bucket is unavailable)
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'evidence') then
    insert into storage.buckets (id, name, public)
    values ('evidence', 'evidence', false)
    on conflict (id) do nothing;
  end if;

  if not exists (select 1 from storage.buckets where id = 'project-files') then
    insert into storage.buckets (id, name, public)
    values ('project-files', 'project-files', false)
    on conflict (id) do nothing;
  end if;
end$$;

-- 2) Policies for project-files bucket:
-- Existing baseline policies are in 025_storage_project_files.sql (read for members, insert/delete for editors)
-- We additionally allow MEMBERS to insert/delete under daily-logs path specifically.

-- Allow project members to insert files under .../daily-logs/...
drop policy if exists project_files_insert_daily_logs on storage.objects;
create policy project_files_insert_daily_logs on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and position('/daily-logs/' in name) > 0
  and is_project_member(extract_project_from_path(name), auth.uid())
);

-- Allow project members to delete files under .../daily-logs/...
drop policy if exists project_files_delete_daily_logs on storage.objects;
create policy project_files_delete_daily_logs on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and position('/daily-logs/' in name) > 0
  and is_project_member(extract_project_from_path(name), auth.uid())
);

-- Note: RFI uploads for members are handled in 046_project_files_rfi_member_insert.sql
--       Read access for members already exists in 025_storage_project_files.sql
--       Add delete permission for RFI photos to project members as well

drop policy if exists project_files_delete_rfi on storage.objects;
create policy project_files_delete_rfi on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and position('/rfi/' in name) > 0
  and is_project_member(extract_project_from_path(name), auth.uid())
);
