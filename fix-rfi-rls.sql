-- Fix RLS function to handle project-files path format
-- Run this SQL in Supabase Dashboard > SQL Editor

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
    -- Fallback: assume direct UUID
    part := p_name;
  end if;
  
  -- Validate UUID format
  if length(part) = 36 and part ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_uuid := part::uuid;
  else
    v_uuid := null;
  end if;
  
  return v_uuid;
end;
$$;