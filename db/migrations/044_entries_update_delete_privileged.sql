-- Privileged functions for updating notes and deleting entries with membership check
create or replace function update_entry_notes_privileged(
  p_user_id uuid,
  p_entry_id uuid,
  p_notes text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ensure user is a member of the project owning the entry
  perform 1
  from entries e
  join project_members m on m.project_id = e.project_id and m.user_id = p_user_id and m.role in ('owner','editor')
  where e.id = p_entry_id;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update entries
  set notes = p_notes
  where id = p_entry_id;
end;
$$;

create or replace function delete_entry_privileged(
  p_user_id uuid,
  p_entry_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ensure user is a member of the project owning the entry
  perform 1
  from entries e
  join project_members m on m.project_id = e.project_id and m.user_id = p_user_id and m.role in ('owner','editor')
  where e.id = p_entry_id;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from entries where id = p_entry_id;
end;
$$;

-- Lock down and grant execute explicitly
revoke all on function update_entry_notes_privileged(uuid, uuid, text) from public;
grant execute on function update_entry_notes_privileged(uuid, uuid, text) to authenticated;

revoke all on function delete_entry_privileged(uuid, uuid) from public;
grant execute on function delete_entry_privileged(uuid, uuid) to authenticated;
