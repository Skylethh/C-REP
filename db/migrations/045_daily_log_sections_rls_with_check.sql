-- Explicit WITH CHECK policies for INSERT/UPDATE on daily log sections
-- This complements existing "for all using" policies by ensuring new rows pass membership checks.

-- Manpower
drop policy if exists dl_manpower_insert on daily_log_manpower;
create policy dl_manpower_insert on daily_log_manpower for insert with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_manpower.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

drop policy if exists dl_manpower_update on daily_log_manpower;
create policy dl_manpower_update on daily_log_manpower for update using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_manpower.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
) with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_manpower.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

-- Equipment
drop policy if exists dl_equipment_insert on daily_log_equipment;
create policy dl_equipment_insert on daily_log_equipment for insert with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_equipment.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

drop policy if exists dl_equipment_update on daily_log_equipment;
create policy dl_equipment_update on daily_log_equipment for update using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_equipment.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
) with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_equipment.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

-- Materials
drop policy if exists dl_materials_insert on daily_log_materials;
create policy dl_materials_insert on daily_log_materials for insert with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_materials.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

drop policy if exists dl_materials_update on daily_log_materials;
create policy dl_materials_update on daily_log_materials for update using (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_materials.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
) with check (
  exists(
    select 1 from daily_logs dl
    join project_members pm on pm.project_id = dl.project_id
    where dl.id = daily_log_materials.log_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);
