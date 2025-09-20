-- 059_storage_project_reports.sql
-- Create 'project-reports' bucket if missing and define policies

-- 1) Ensure bucket exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-reports') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('project-reports', 'project-reports', false)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END$$;

-- 2) Policies
-- Read: project members can read files under project-reports/{project_id}/...
DROP POLICY IF EXISTS project_reports_read ON storage.objects;
CREATE POLICY project_reports_read ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-reports'
  AND is_project_member(extract_project_from_path(name), auth.uid())
);

-- Insert: allow project members to upload under their project path
DROP POLICY IF EXISTS project_reports_insert ON storage.objects;
CREATE POLICY project_reports_insert ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-reports'
  AND is_project_member(extract_project_from_path(name), auth.uid())
);

-- Delete: allow editors/owners to delete
DROP POLICY IF EXISTS project_reports_delete ON storage.objects;
CREATE POLICY project_reports_delete ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-reports'
  AND is_project_editor(extract_project_from_path(name), auth.uid())
);
