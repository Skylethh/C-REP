-- Restrict deletes for Evidence, RFI photos, and Daily Log photos to creator or project editors
-- Also add a helper to extract the second UUID from storage paths like:
--   project-files/{project_uuid}/rfi/{rfi_uuid}/...
--   project-files/{project_uuid}/daily-logs/{log_uuid}/...

-- 1) Helper: extract the Nth UUID-like segment from a path; we expose a convenience for the 2nd
create or replace function extract_second_uuid(p_name text)
returns uuid language plpgsql immutable as $$
declare
  seg text;
  i int := 1;
  uuid_count int := 0;
  v_uuid uuid;
begin
  loop
    seg := split_part(p_name, '/', i);
    exit when seg = '';
    begin
      v_uuid := seg::uuid;
      uuid_count := uuid_count + 1;
      if uuid_count = 2 then
        return v_uuid;
      end if;
    exception when others then
      -- not a uuid, continue scanning
    end;
    i := i + 1;
  end loop;
  return null;
end;$$;

-- 2) Evidence bucket: delete allowed to creator or project editors only
drop policy if exists evidence_delete on storage.objects;
create policy evidence_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidence'
  and (
    exists(
      select 1 from evidence_files ef
      where ef.file_path = name
        and ef.created_by = auth.uid()
    )
    or is_project_editor(extract_project_from_path(name), auth.uid())
  )
);

-- 3) Project-files bucket: tighten delete rules for RFI and Daily Logs specifically
-- First, ensure the generic delete policy does not cover these subpaths so that specific rules apply
drop policy if exists project_files_delete on storage.objects;
create policy project_files_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and position('/rfi/' in name) = 0
  and position('/daily-logs/' in name) = 0
  and is_project_member(extract_project_from_path(name), auth.uid())
);

-- RFI photos: only RFI creator or project editors may delete
drop policy if exists project_files_delete_rfi on storage.objects;
create policy project_files_delete_rfi on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and position('/rfi/' in name) > 0
  and (
    exists(
      select 1 from rfi r
      where r.id = extract_second_uuid(name)
        and r.created_by = auth.uid()
    )
    or is_project_editor(extract_project_from_path(name), auth.uid())
  )
);

-- Daily Log photos: only log creator or project editors may delete
drop policy if exists project_files_delete_daily_logs on storage.objects;
create policy project_files_delete_daily_logs on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and position('/daily-logs/' in name) > 0
  and (
    exists(
      select 1 from daily_logs dl
      where dl.id = extract_second_uuid(name)
        and dl.created_by = auth.uid()
    )
    or is_project_editor(extract_project_from_path(name), auth.uid())
  )
);

-- 4) Evidence table: allow creators to delete their own records in addition to editors/owners
drop policy if exists evidence_files_delete_creator on evidence_files;
create policy evidence_files_delete_creator on evidence_files
for delete
to authenticated
using (
  created_by = auth.uid()
);

-- 5) Daily logs: allow the creator to update their own log (to update photos JSON)
drop policy if exists daily_logs_modify_creator on daily_logs;
create policy daily_logs_modify_creator on daily_logs
for update
to authenticated
using (
  created_by = auth.uid()
);

-- 6) RFI: allow the creator to update their own RFI (to update photos JSON)
drop policy if exists rfi_modify_creator on rfi;
create policy rfi_modify_creator on rfi
for update
to authenticated
using (
  created_by = auth.uid()
);
