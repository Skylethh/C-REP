-- Invites table
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor','viewer')),
  token uuid not null unique default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz default now(),
  accepted_at timestamptz
);

alter table invites enable row level security;

-- Policy: inviter (project owner) can select their invites; invitee can select by email
drop policy if exists invites_select on invites;
create policy invites_select on invites for select using (
  exists (
    select 1 from project_members pm where pm.project_id = invites.project_id and pm.user_id = auth.uid() and pm.role = 'owner'
  ) or exists (
    select 1 from auth.users u where u.id = auth.uid() and u.email = invites.email
  )
);

-- RPCs
create or replace function create_invite(p_project uuid, p_actor uuid, p_email text, p_role text)
returns uuid
language plpgsql security definer as $$
declare v_is_owner boolean; v_token uuid; begin
  select exists(select 1 from project_members where project_id = p_project and user_id = p_actor and role = 'owner') into v_is_owner;
  if not v_is_owner then raise exception 'only owner can invite'; end if;
  insert into invites(project_id, email, role, inviter_id)
  values (p_project, p_email, p_role, p_actor)
  returning token into v_token;
  return v_token;
end;$$;
revoke all on function create_invite(uuid, uuid, text, text) from public;
grant execute on function create_invite(uuid, uuid, text, text) to authenticated;

create or replace function accept_invite(p_token uuid, p_user uuid)
returns void
language plpgsql security definer as $$
declare v_project uuid; v_role text; begin
  select project_id, role into v_project, v_role from invites where token = p_token and status = 'pending';
  if v_project is null then raise exception 'invalid or used token'; end if;
  insert into project_members(project_id, user_id, role)
  values (v_project, p_user, v_role)
  on conflict (project_id, user_id) do update set role = excluded.role;
  update invites set status = 'accepted', accepted_at = now() where token = p_token;
end;$$;
revoke all on function accept_invite(uuid, uuid) from public;
grant execute on function accept_invite(uuid, uuid) to authenticated;


