-- Enforce allowed MIME and size via storage policies check expressions are limited;
-- We implement a helper function to validate by extension as a proxy.

create or replace function storage_allowed(p_name text)
returns boolean language plpgsql immutable as $$
declare ext text; begin
  ext := lower(split_part(p_name, '.', 2));
  return ext in ('png','jpg','jpeg','webp','pdf');
end;$$;

-- Update insert policy to include name validation
drop policy if exists evidence_insert on storage.objects;
create policy evidence_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'evidence'
  and storage_allowed(name)
  and is_project_editor(extract_project_from_path(name), auth.uid())
);


