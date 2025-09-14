-- Activity / Material Library

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  type text not null check (type in ('energy','transport','materials','other')),
  scope text check (scope in ('scope1','scope2','scope3')),
  category text,
  default_unit text not null,
  units text[] not null default '{}',
  created_at timestamptz default now()
);

alter table activities enable row level security;

drop policy if exists activities_select on activities;
create policy activities_select on activities for select using (true);


