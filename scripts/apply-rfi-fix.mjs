// Apply the migration to fix RFI photo upload RLS issue
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const migrationSQL = `
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
`;

async function applyMigration() {
  console.log('Applying RLS fix for project-files paths...');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql: migrationSQL })
    });
    
    if (response.ok) {
      console.log('✅ Migration applied successfully!');
      console.log('📁 extract_project_from_path function updated to handle project-files paths');
      console.log('🔒 RLS policies should now work for RFI photo uploads');
    } else {
      const errorText = await response.text();
      console.error('❌ Migration failed:', response.status, errorText);
    }
  } catch (err) {
    console.error('❌ Network error:', err.message);
  }
}

applyMigration();