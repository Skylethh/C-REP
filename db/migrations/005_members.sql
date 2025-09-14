-- Find user id by email (SECURITY DEFINER)
create or replace function find_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
as $$
declare v_id uuid; begin
  select id into v_id from auth.users where email = p_email limit 1;
  return v_id;
end;$$;

revoke all on function find_user_id_by_email(text) from public;
grant execute on function find_user_id_by_email(text) to authenticated;

-- Remove member (owner-only)
create or replace function remove_member(
  p_project uuid,
  p_actor uuid,
  p_user uuid
) returns void
language plpgsql
security definer
as $$
declare v_owner boolean; begin
  select exists(
    select 1 from project_members
    where project_id = p_project and user_id = p_actor and role = 'owner'
  ) into v_owner;
  if not v_owner then
    raise exception 'only owner can remove members';
  end if;
  delete from project_members where project_id = p_project and user_id = p_user;
end;$$;

revoke all on function remove_member(uuid, uuid, uuid) from public;
grant execute on function remove_member(uuid, uuid, uuid) to authenticated;


