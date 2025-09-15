-- Per-user favorites for activities

create table if not exists user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, activity_id)
);

alter table user_favorites enable row level security;

drop policy if exists fav_select on user_favorites;
create policy fav_select on user_favorites for select using (user_id = auth.uid());
drop policy if exists fav_modify on user_favorites;
create policy fav_modify on user_favorites for all using (user_id = auth.uid());


