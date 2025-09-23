-- Relax audit_logs insert policy to avoid RLS violations from audit triggers during cascading deletes (e.g., project deletion)
-- We still keep SELECT restricted to project membership in 021_audit_triggers.sql.

drop policy if exists audit_logs_insert on audit_logs;
create policy audit_logs_insert on audit_logs
for insert
to authenticated
with check (
	-- Allow insert if there is no project context
	(metadata ? 'project_id') = false
	-- Always allow audit rows for DELETE operations (membership may already be removed)
	or action = 'DELETE'
	-- Or allow if user is a member of the project
	or exists (
		select 1 from project_members pm
		where pm.user_id = auth.uid()
			and pm.project_id = (audit_logs.metadata->>'project_id')::uuid
	)
);
