-- Allow insert operations on audit_logs for authenticated users
-- This policy is needed because audit triggers automatically insert records
-- when other tables are modified (evidence_files, entries, project_members, etc.)

drop policy if exists audit_logs_insert on audit_logs;
create policy audit_logs_insert on audit_logs
for insert
to authenticated
with check (
  -- Allow insert if user is authenticated and the audit log is for a project
  -- they are a member of, or if it's a system-generated log without project context
  (metadata ? 'project_id') = false OR
  exists (
    select 1 from project_members pm
    where pm.user_id = auth.uid()
      and pm.project_id = (audit_logs.metadata->>'project_id')::uuid
  )
);