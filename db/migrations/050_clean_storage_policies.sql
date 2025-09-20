-- Storage politikalarını temizle ve yeniden kur
-- Bu script mevcut çakışan politikaları temizleyip doğru olanları kuracak

-- 1) Tüm storage politikalarını temizle
drop policy if exists evidence_read on storage.objects;
drop policy if exists evidence_insert on storage.objects;
drop policy if exists evidence_delete on storage.objects;
drop policy if exists evidence_insert_members on storage.objects;
drop policy if exists evidence_delete_members on storage.objects;

drop policy if exists project_files_read on storage.objects;
drop policy if exists project_files_insert on storage.objects;
drop policy if exists project_files_delete on storage.objects;
drop policy if exists project_files_insert_daily_logs on storage.objects;
drop policy if exists project_files_delete_daily_logs on storage.objects;
drop policy if exists project_files_insert_rfi on storage.objects;
drop policy if exists project_files_delete_rfi on storage.objects;
drop policy if exists project_files_insert_rfi_member_insert on storage.objects;

-- 2) Bucket'ları oluştur (eğer yoksa)
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'evidence') then
    insert into storage.buckets (id, name, public)
    values ('evidence', 'evidence', false)
    on conflict (id) do nothing;
  end if;

  if not exists (select 1 from storage.buckets where id = 'project-files') then
    insert into storage.buckets (id, name, public)
    values ('project-files', 'project-files', false)
    on conflict (id) do nothing;
  end if;
end$$;

-- 3) Evidence bucket için temiz politikalar
create policy evidence_read on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidence'
  and is_project_member(extract_project_from_path(name), auth.uid())
);

create policy evidence_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidence'
  and is_project_member(extract_project_from_path(name), auth.uid())
);

create policy evidence_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidence'
  and is_project_member(extract_project_from_path(name), auth.uid())
);

-- 4) Project-files bucket için temiz politikalar
create policy project_files_read on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-files'
  and is_project_member(extract_project_from_path(name), auth.uid())
);

create policy project_files_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and is_project_member(extract_project_from_path(name), auth.uid())
);

create policy project_files_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and is_project_member(extract_project_from_path(name), auth.uid())
);