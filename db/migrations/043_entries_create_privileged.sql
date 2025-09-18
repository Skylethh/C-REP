-- Privileged insert for entries, with explicit membership check
-- Bypasses RLS safely via SECURITY DEFINER

create or replace function create_entry_privileged(
  p_project_id uuid,
  p_user_id uuid,
  p_type text,
  p_date date,
  p_amount numeric,
  p_unit text,
  p_scope text,
  p_category text,
  p_activity_id uuid,
  p_notes text,
  p_co2e_value numeric,
  p_co2e_unit text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_allowed boolean;
  v_id uuid;
begin
  -- Ensure caller is member with owner/editor role
  select exists(
    select 1 from project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = p_user_id
      and pm.role in ('owner','editor')
  ) into v_allowed;

  if not v_allowed then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into entries(
    project_id, type, date, amount, unit, scope, category,
    activity_id, notes, created_by, co2e_value, co2e_unit
  ) values (
    p_project_id, p_type, p_date, p_amount, p_unit, p_scope, p_category,
    p_activity_id, p_notes, p_user_id, p_co2e_value, p_co2e_unit
  ) returning id into v_id;

  return v_id;
end;$$;

revoke all on function create_entry_privileged(
  uuid, uuid, text, date, numeric, text, text, text, uuid, text, numeric, text
) from public;
grant execute on function create_entry_privileged(
  uuid, uuid, text, date, numeric, text, text, text, uuid, text, numeric, text
) to authenticated;
