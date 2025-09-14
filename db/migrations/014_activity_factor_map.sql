create table if not exists activity_factors (
  activity_id uuid not null references activities(id) on delete cascade,
  factor_id uuid not null references emission_factors(id) on delete cascade,
  primary key (activity_id, factor_id)
);

alter table activity_factors enable row level security;
drop policy if exists activity_factors_select on activity_factors;
create policy activity_factors_select on activity_factors for select using (true);


