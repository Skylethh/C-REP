-- Return project members along with their emails (SECURITY DEFINER)
-- Only callable by users who are already members of the project

create or replace function get_project_members(
  p_project uuid
) returns table (
  user_id uuid,
  role text,
  email text
)
language sql
security definer
as $$
  select pm.user_id, pm.role, u.email
  from project_members pm
  join auth.users u on u.id = pm.user_id
  where pm.project_id = p_project
    and exists (
      select 1 from project_members x
      where x.project_id = p_project and x.user_id = auth.uid()
    );
$$;

revoke all on function get_project_members(uuid) from public;
grant execute on function get_project_members(uuid) to authenticated;
