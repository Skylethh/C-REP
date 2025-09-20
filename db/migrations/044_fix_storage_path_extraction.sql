-- Fix extract_project_from_path to handle both evidence and project-files paths

create or replace function extract_project_from_path(p_name text)
returns uuid language plpgsql immutable as $$
declare
  part text;
  v_uuid uuid;
begin
  -- Handle different path patterns:
  -- evidence/{project_uuid}/file.ext (legacy)
  -- project-files/{project_uuid}/... (new pattern)
  
  if p_name ~ '^evidence/' then
    -- Legacy pattern: evidence/{project_uuid}/...
    part := split_part(p_name, '/', 2);
  elsif p_name ~ '^project-files/' then
    -- New pattern: project-files/{project_uuid}/...
    part := split_part(p_name, '/', 2);
  else
    -- Try second segment as fallback
    part := split_part(p_name, '/', 2);
  end if;
  
  begin
    v_uuid := part::uuid;
    return v_uuid;
  exception when others then
    return null;
  end;
end;$$;