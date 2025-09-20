-- 060_generated_reports_extras.sql
-- Add report_id and checksum fields to generated_reports for traceability and authenticity

alter table generated_reports
  add column if not exists report_id text,
  add column if not exists checksum_sha256 text;

-- Optional index to quickly search by report_id
create index if not exists idx_generated_reports_report_id on generated_reports(report_id);
