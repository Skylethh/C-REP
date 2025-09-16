-- 029_documents_notes_and_tools.sql
-- Add revision note, RPC to set current revision, and helpers for rename/delete

-- Add note column to document_revisions
alter table if exists document_revisions
  add column if not exists note text;

-- Update RPC create_or_update_document to accept p_note and store it
drop function if exists create_or_update_document(uuid, uuid, text, text, text, text, integer, text);
create or replace function create_or_update_document(
  p_project uuid,
  p_actor uuid,
  p_code text,
  p_name text,
  p_file_path text,
  p_mime text,
  p_size integer,
  p_hash text,
  p_note text default null
) returns uuid
language plpgsql security definer as $$
declare
  v_doc_id uuid;
  v_rev integer;
  v_rev_id uuid;
begin
  -- membership check
  if not exists (select 1 from project_members pm where pm.project_id = p_project and pm.user_id = p_actor) then
    raise exception 'not a project member';
  end if;

  -- upsert document by project+code
  select id into v_doc_id from documents where project_id = p_project and code = p_code limit 1;
  if v_doc_id is null then
    insert into documents(project_id, code, name, created_by)
    values (p_project, p_code, p_name, p_actor)
    returning id into v_doc_id;
  else
    -- optional: keep latest provided name
    update documents set name = p_name where id = v_doc_id and name is distinct from p_name;
  end if;

  -- next revision number
  select coalesce(max(rev_no), 0) + 1 into v_rev from document_revisions where document_id = v_doc_id;

  insert into document_revisions(document_id, rev_no, file_path, mime, size, hash, note, created_by)
  values (v_doc_id, v_rev, p_file_path, p_mime, p_size, p_hash, p_note, p_actor)
  returning id into v_rev_id;

  update documents set current_revision = v_rev where id = v_doc_id;

  return v_rev_id;
end;$$;

revoke all on function create_or_update_document(uuid, uuid, text, text, text, text, integer, text, text) from public;
grant execute on function create_or_update_document(uuid, uuid, text, text, text, text, integer, text, text) to authenticated;

-- RPC: set current revision to a specific rev (revert)
create or replace function set_document_current_revision(
  p_document uuid,
  p_rev integer,
  p_actor uuid
) returns void
language plpgsql security definer as $$
declare
  v_project uuid;
begin
  select d.project_id into v_project from documents d where d.id = p_document;
  if v_project is null then
    raise exception 'document not found';
  end if;
  if not exists (
    select 1 from project_members pm where pm.project_id = v_project and pm.user_id = p_actor and pm.role in ('owner','editor')
  ) then
    raise exception 'forbidden';
  end if;
  if not exists (
    select 1 from document_revisions r where r.document_id = p_document and r.rev_no = p_rev
  ) then
    raise exception 'revision not found';
  end if;
  update documents set current_revision = p_rev where id = p_document;
end;$$;

revoke all on function set_document_current_revision(uuid, integer, uuid) from public;
grant execute on function set_document_current_revision(uuid, integer, uuid) to authenticated;
