-- Organization logo support

alter table organizations add column if not exists logo_url text;

-- Create a public bucket for logos (run once in SQL console if needed):
-- select storage.create_bucket('public', public => true);

-- Storage policies for public bucket: allow read to all, write limited to org members via prefix org-<id>/
-- Note: adjust to your security requirements; public read implies logos are publicly accessible by URL.
-- Here we only document; actual policy creation depends on existing global storage RLS setup.


