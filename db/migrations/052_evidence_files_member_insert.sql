-- Allow project members to insert rows into evidence_files
-- Existing policy evidence_modify requires editor/owner for ALL; this insert policy opens inserts to members.

drop policy if exists evidence_files_insert on evidence_files;
create policy evidence_files_insert on evidence_files
for insert
to authenticated
with check (
  is_project_member(evidence_files.project_id, auth.uid())
);
