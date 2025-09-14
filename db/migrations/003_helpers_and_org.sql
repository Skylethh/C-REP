-- Create organization with owner membership
create or replace function create_organization(
  p_name text,
  p_owner uuid
) returns uuid
language plpgsql
security definer
as $$
declare
  v_org uuid;
begin
  insert into organizations(name)
  values (p_name)
  returning id into v_org;

  insert into organization_members(organization_id, user_id, role)
  values (v_org, p_owner, 'owner')
  on conflict do nothing;

  return v_org;
end;$$;

revoke all on function create_organization(text, uuid) from public;
grant execute on function create_organization(text, uuid) to authenticated;

-- Membership helper functions
create or replace function is_org_member(p_org uuid, p_user uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from organization_members m
    where m.organization_id = p_org and m.user_id = p_user
  );
$$;

create or replace function is_project_member(p_project uuid, p_user uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from project_members pm
    where pm.project_id = p_project and pm.user_id = p_user
  );
$$;

create or replace function is_project_editor(p_project uuid, p_user uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from project_members pm
    where pm.project_id = p_project and pm.user_id = p_user and pm.role in ('owner','editor')
  );
$$;

-- Extract project uuid from storage path like evidence/{project_uuid}/whatever
create or replace function extract_project_from_path(p_name text)
returns uuid language plpgsql immutable as $$
declare
  part text;
  v_uuid uuid;
begin
  -- name example: evidence/2b7d8a2e-.../file.ext
  part := split_part(p_name, '/', 2);
  begin
    v_uuid := part::uuid;
    return v_uuid;
  exception when others then
    return null;
  end;
end;$$;


