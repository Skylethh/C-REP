-- Fix infinite recursion on project_members select policy by avoiding self-referential subquery
drop policy if exists project_members_select on project_members;
create policy project_members_select on project_members for select using (
  user_id = auth.uid()
);

-- RFI enhancements: sequence, code, requester, references, and messages
alter table rfi add column if not exists seq integer;
alter table rfi add column if not exists code text;
alter table rfi add column if not exists from_party text; -- e.g., Biz, X Taşeronu
alter table rfi add column if not exists reference_text text; -- drawings/spec refs

create table if not exists rfi_messages (
  id uuid primary key default gen_random_uuid(),
  rfi_id uuid not null references rfi(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  message text not null,
  created_at timestamptz default now()
);
alter table rfi_messages enable row level security;

drop policy if exists rfi_messages_select on rfi_messages;
create policy rfi_messages_select on rfi_messages for select using (
  exists (
    select 1 from rfi inner join project_members pm on pm.project_id = rfi.project_id
    where rfi.id = rfi_messages.rfi_id and pm.user_id = auth.uid()
  )
);

drop policy if exists rfi_messages_insert on rfi_messages;
create policy rfi_messages_insert on rfi_messages for insert with check (
  exists (
    select 1 from rfi inner join project_members pm on pm.project_id = rfi.project_id
    where rfi.id = rfi_messages.rfi_id and pm.user_id = auth.uid()
  )
);

-- Auto-number RFI per project via RPC
create or replace function create_rfi(
  p_project uuid,
  p_actor uuid,
  p_title text,
  p_description text,
  p_to_role text,
  p_due_date date,
  p_from_party text,
  p_reference_text text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_seq integer;
  v_code text;
  v_id uuid;
begin
  -- Ensure actor is project member
  if not exists (select 1 from project_members pm where pm.project_id = p_project and pm.user_id = p_actor) then
    raise exception 'not a project member';
  end if;

  -- Next sequence number
  select coalesce(max(seq),0)+1 into v_seq from rfi where project_id = p_project;
  v_code := 'RFI-' || lpad(v_seq::text, 3, '0');

  insert into rfi(project_id, title, description, to_role, due_date, from_party, reference_text, seq, code, created_by)
  values (p_project, p_title, p_description, p_to_role, p_due_date, p_from_party, p_reference_text, v_seq, v_code, p_actor)
  returning id into v_id;

  return v_id;
end;$$;

revoke all on function create_rfi(uuid, uuid, text, text, text, date, text, text) from public;
grant execute on function create_rfi(uuid, uuid, text, text, text, date, text, text) to authenticated;
