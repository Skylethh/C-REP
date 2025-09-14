-- SECURITY DEFINER RPCs

create or replace function create_project(
  p_org uuid,
  p_owner uuid,
  p_name text,
  p_desc text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_project uuid;
begin
  insert into projects(organization_id, name, description, owner_id)
  values (p_org, p_name, p_desc, p_owner)
  returning id into v_project;

  insert into project_members(project_id, user_id, role)
  values (v_project, p_owner, 'owner')
  on conflict do nothing;

  return v_project;
end;$$;

revoke all on function create_project(uuid, uuid, text, text) from public;
grant execute on function create_project(uuid, uuid, text, text) to authenticated;

create or replace function add_member(
  p_project uuid,
  p_actor uuid,
  p_user uuid,
  p_role text
) returns void
language plpgsql
security definer
as $$
declare
  v_owner boolean;
begin
  select exists(
    select 1 from project_members
    where project_id = p_project and user_id = p_actor and role = 'owner'
  ) into v_owner;

  if not v_owner then
    raise exception 'only owner can add members';
  end if;

  insert into project_members(project_id, user_id, role)
  values (p_project, p_user, p_role)
  on conflict (project_id, user_id) do update set role = excluded.role;
end;$$;

revoke all on function add_member(uuid, uuid, uuid, text) from public;
grant execute on function add_member(uuid, uuid, uuid, text) to authenticated;


