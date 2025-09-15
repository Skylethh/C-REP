-- Audit triggers and RLS for audit_logs

-- Function to log row-level changes with project scoping in metadata
create or replace function log_audit_row()
returns trigger
language plpgsql
as $$
declare
  v_user uuid;
  v_project uuid;
  v_meta jsonb;
begin
  -- Determine actor; fallback to created_by if available
  begin
    v_user := auth.uid();
  exception when others then
    v_user := null;
  end;
  if v_user is null then
    v_user := coalesce((NEW).created_by, (OLD).created_by, '00000000-0000-0000-0000-000000000000'::uuid);
  end if;

  -- Project id if present on the row (our target tables have project_id)
  v_project := coalesce((NEW).project_id, (OLD).project_id);

  -- Build metadata with old/new and top-level project_id for RLS filtering
  v_meta := jsonb_build_object(
    'project_id', v_project,
    'old', to_jsonb(OLD),
    'new', to_jsonb(NEW)
  );

  insert into audit_logs(user_id, action, resource, metadata)
  values (v_user, TG_OP, TG_TABLE_NAME, v_meta);

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

-- Triggers for entries, evidence_files, project_members
drop trigger if exists trg_audit_entries_ins on entries;
drop trigger if exists trg_audit_entries_upd on entries;
drop trigger if exists trg_audit_entries_del on entries;
create trigger trg_audit_entries_ins
after insert on entries
for each row execute function log_audit_row();
create trigger trg_audit_entries_upd
after update on entries
for each row execute function log_audit_row();
create trigger trg_audit_entries_del
after delete on entries
for each row execute function log_audit_row();

drop trigger if exists trg_audit_evidence_ins on evidence_files;
drop trigger if exists trg_audit_evidence_upd on evidence_files;
drop trigger if exists trg_audit_evidence_del on evidence_files;
create trigger trg_audit_evidence_ins
after insert on evidence_files
for each row execute function log_audit_row();
create trigger trg_audit_evidence_upd
after update on evidence_files
for each row execute function log_audit_row();
create trigger trg_audit_evidence_del
after delete on evidence_files
for each row execute function log_audit_row();

drop trigger if exists trg_audit_members_ins on project_members;
drop trigger if exists trg_audit_members_upd on project_members;
drop trigger if exists trg_audit_members_del on project_members;
create trigger trg_audit_members_ins
after insert on project_members
for each row execute function log_audit_row();
create trigger trg_audit_members_upd
after update on project_members
for each row execute function log_audit_row();
create trigger trg_audit_members_del
after delete on project_members
for each row execute function log_audit_row();

-- Helpful indexes
create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);
create index if not exists idx_audit_logs_resource_created on audit_logs(resource, created_at desc);

-- RLS policies for audit_logs
-- Allow select only if user is a member of the project referenced by metadata.project_id
drop policy if exists audit_logs_select on audit_logs;
create policy audit_logs_select on audit_logs for select using (
  (metadata ? 'project_id') and
  exists (
    select 1 from project_members pm
    where pm.user_id = auth.uid()
      and pm.project_id = (audit_logs.metadata->>'project_id')::uuid
  )
);


