-- KAPSAMLI VERİTABANI TEMİZLEME VE YENİDEN KURMA SCRİPTİ
-- Bu script tüm storage, RLS ve ilgili yapıları temizleyip sıfırdan kurar
-- Güvenli: Mevcut verileri silmez, sadece politika ve yapı çakışmalarını çözer

-- =============================================================================
-- 0. HELPER FONKSİYONLARI (ÖNCE OLUŞTUR)
-- =============================================================================

-- UUID çıkarma yardımcıları: daha sağlam bir yaklaşım
-- 1) İlk geçen UUID'i çıkaran fonksiyon
create or replace function extract_first_uuid(p_name text)
returns uuid language plpgsql immutable as $$
declare
  seg text;
  v uuid;
begin
  -- Try each path segment; return the first that casts to uuid
  foreach seg in array regexp_split_to_array(coalesce(p_name, ''), '/') loop
    begin
      v := seg::uuid;
      return v;
    exception when others then
      -- not a uuid; continue scanning
      continue;
    end;
  end loop;
  return null;
end;
$$;

-- 2) Geriye dönük uyumluluk için extract_project_from_path, extract_first_uuid'i kullanır
create or replace function extract_project_from_path(p_name text)
returns uuid language sql immutable as $$
  select extract_first_uuid(p_name)
$$;

-- =============================================================================
-- 1. TÜM STORAGE POLİTİKALARINI TEMİZLE
-- =============================================================================

-- Evidence bucket politikaları
drop policy if exists evidence_read on storage.objects;
drop policy if exists evidence_insert on storage.objects;
drop policy if exists evidence_delete on storage.objects;
drop policy if exists evidence_insert_members on storage.objects;
drop policy if exists evidence_delete_members on storage.objects;

-- Project-files bucket politikaları (tüm varyasyonlar)
drop policy if exists project_files_read on storage.objects;
drop policy if exists project_files_insert on storage.objects;
drop policy if exists project_files_delete on storage.objects;
drop policy if exists project_files_insert_daily_logs on storage.objects;
drop policy if exists project_files_delete_daily_logs on storage.objects;
drop policy if exists project_files_insert_rfi on storage.objects;
drop policy if exists project_files_delete_rfi on storage.objects;
drop policy if exists project_files_rfi_member_insert on storage.objects;
drop policy if exists project_files_insert_rfi_member_insert on storage.objects;

-- Public bucket politikaları (eğer varsa)
drop policy if exists public_read on storage.objects;
drop policy if exists public_insert on storage.objects;
drop policy if exists public_delete on storage.objects;

-- Storage limitleri politikaları (010 migration'dan)
drop policy if exists storage_size_limit on storage.objects;

-- =============================================================================
-- 2. STORAGE BUCKET'LARINI KONTROL ET VE OLUŞTUR
-- =============================================================================

do $$
begin
  -- Evidence bucket
  if not exists (select 1 from storage.buckets where id = 'evidence') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('evidence', 'evidence', false, 52428800, null)  -- 50MB limit
    on conflict (id) do nothing;
  else
    -- Bucket varsa, sadece ayarları güncelle
    update storage.buckets 
    set public = false, file_size_limit = 52428800 
    where id = 'evidence';
  end if;

  -- Project-files bucket
  if not exists (select 1 from storage.buckets where id = 'project-files') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('project-files', 'project-files', false, 52428800, null)  -- 50MB limit
    on conflict (id) do nothing;
  else
    update storage.buckets 
    set public = false, file_size_limit = 52428800 
    where id = 'project-files';
  end if;

  -- Public bucket (logo'lar için, eğer gerekirse)
  if not exists (select 1 from storage.buckets where id = 'public') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('public', 'public', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])  -- 5MB, sadece resim
    on conflict (id) do nothing;
  end if;

  raise notice 'Storage buckets kontrol edildi ve güncellendi.';
end$$;

-- =============================================================================
-- 3. TEMİZ RLS POLİTİKALARI OLUŞTUR
-- =============================================================================

-- Evidence bucket politikaları
create policy evidence_read on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidence'
  and is_project_member(extract_first_uuid(name), auth.uid())
);

create policy evidence_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidence'
  and is_project_member(extract_first_uuid(name), auth.uid())
);

create policy evidence_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidence'
  and is_project_member(extract_first_uuid(name), auth.uid())
);

-- Project-files bucket politikaları
create policy project_files_read on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-files'
  and is_project_member(extract_first_uuid(name), auth.uid())
);

create policy project_files_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and is_project_member(extract_first_uuid(name), auth.uid())
);

create policy project_files_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and is_project_member(extract_first_uuid(name), auth.uid())
);

-- Public bucket politikaları (logo'lar için)
create policy public_read on storage.objects
for select
to authenticated  -- Sadece authenticated kullanıcılar okuyabilir
using (bucket_id = 'public');

create policy public_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'public'
  and starts_with(name, 'org-')  -- Sadece org- ile başlayan dosyalar
);

-- 4-5. Ek kontrol ve rapor bölümleri kaldırıldı (bundle sade tutuldu)