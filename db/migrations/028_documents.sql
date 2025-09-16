-- 028_documents.sql
-- Documents and Revisions with RLS and helper RPC

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  code text not null,
  name text not null,
  current_revision integer not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  unique(project_id, code)
);

create table if not exists document_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  rev_no integer not null,
  file_path text not null,
  mime text not null,
  size integer,
  hash text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  unique(document_id, rev_no)
);

-- Indexes
create index if not exists idx_documents_project_code on documents(project_id, code);
create index if not exists idx_docrevs_document_rev on document_revisions(document_id, rev_no desc);
create index if not exists idx_docrevs_created_at on document_revisions(created_at desc);

-- Enable RLS
alter table documents enable row level security;
alter table document_revisions enable row level security;

-- Policies: members can read; editors/owners can write
drop policy if exists documents_select on documents;
create policy documents_select on documents for select using (
  exists (select 1 from project_members pm where pm.project_id = documents.project_id and pm.user_id = auth.uid())
);

drop policy if exists documents_modify on documents;
create policy documents_modify on documents for all using (
  exists (select 1 from project_members pm where pm.project_id = documents.project_id and pm.user_id = auth.uid() and pm.role in ('owner','editor'))
);

drop policy if exists docrevs_select on document_revisions;
create policy docrevs_select on document_revisions for select using (
  exists (
    select 1 from documents d join project_members pm on pm.project_id = d.project_id
    where d.id = document_revisions.document_id and pm.user_id = auth.uid()
  )
);

drop policy if exists docrevs_modify on document_revisions;
create policy docrevs_modify on document_revisions for all using (
  exists (
    select 1 from documents d join project_members pm on pm.project_id = d.project_id
    where d.id = document_revisions.document_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

-- RPC: create or update a document by code, auto-increment rev_no
create or replace function create_or_update_document(
  p_project uuid,
  p_actor uuid,
  p_code text,
  p_name text,
  p_file_path text,
  p_mime text,
  p_size integer,
  p_hash text
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

  insert into document_revisions(document_id, rev_no, file_path, mime, size, hash, created_by)
  values (v_doc_id, v_rev, p_file_path, p_mime, p_size, p_hash, p_actor)
  returning id into v_rev_id;

  update documents set current_revision = v_rev where id = v_doc_id;

  return v_rev_id;
end;$$;

revoke all on function create_or_update_document(uuid, uuid, text, text, text, text, integer, text) from public;
grant execute on function create_or_update_document(uuid, uuid, text, text, text, text, integer, text) to authenticated;
