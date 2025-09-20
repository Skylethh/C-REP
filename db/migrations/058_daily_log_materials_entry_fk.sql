-- 058_daily_log_materials_entry_fk.sql
-- Link daily_log_materials to entries for traceability

alter table if exists daily_log_materials
  add column if not exists entry_id uuid references entries(id) on delete set null;

create index if not exists idx_dl_materials_entry on daily_log_materials(entry_id);
