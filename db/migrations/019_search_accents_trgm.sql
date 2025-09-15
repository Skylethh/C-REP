-- 1) İndeksleri kaldır
drop index if exists public.idx_activities_name_trgm;
drop index if exists public.idx_activities_type_trgm;

-- 2) Fonksiyonu kaldır
drop function if exists public.immutable_unaccent(text);

-- 3) Doğru fonksiyonu oluştur
create function public.immutable_unaccent(text)
returns text
language sql
immutable
as $$
  select extensions.unaccent($1::text);
$$;

-- 4) İndeksleri yeniden oluştur
create index if not exists idx_activities_name_trgm
  on public.activities using gin ((public.immutable_unaccent(name)) gin_trgm_ops);

create index if not exists idx_activities_type_trgm
  on public.activities using gin ((public.immutable_unaccent(type)) gin_trgm_ops);