alter table entries add column if not exists activity_id uuid references activities(id);
create index if not exists idx_entries_activity on entries(activity_id);


