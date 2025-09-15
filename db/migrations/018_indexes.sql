-- Indexes to speed up filters and joins
create index if not exists idx_entries_project_date on entries(project_id, date);
create index if not exists idx_entries_project_type on entries(project_id, type);
create index if not exists idx_entries_project_scope on entries(project_id, scope);
create index if not exists idx_entries_project_category on entries(project_id, category);
create index if not exists idx_evidence_project_entry on evidence_files(project_id, entry_id);


