# CarbonProject – Proje Özeti ve Teknik Rehber

Bu dosya, CarbonProject’in genel mimarisini, modüllerini, sayfalarını, veri modelini (DB, RLS, Storage), akışlarını ve geliştirme notlarını kapsamlı şekilde açıklar. Amaç, projeyi hızla kavrayıp güvenle geliştirmeye devam etmenizi sağlamaktır.

## 1) Proje Amacı ve Kapsam

- Amaç: İnşaat projeleri için karbon emisyonu (CO2e) takibi ve iş akışlarının yönetimi (kayıt/entry, aktiviteler, RFI, günlükler vb.).
- Hedefler:
  - Proje ve kayıt bazlı emisyon hesabı ve görselleştirme.
  - RFI (Request for Information) sürecinin uçtan uca yönetimi.
  - Günlükler (Daily Logs), kanıtlar (Evidence) ve dokümanlar üzerinden şeffaflık ve izlenebilirlik.
  - Sıkı güvenlik (RLS), proje-üyelik ve rol bazlı yetkilendirme.

## 2) Teknoloji Yığını

- Frontend/SSR: Next.js (App Router) + TypeScript
- UI: Tailwind CSS, özel bileşen kütüphanesi (cam/gradient kartlar, butonlar vb.)
- Auth + DB + Storage: Supabase (Postgres + RLS + Storage)
- Test: Vitest, Playwright (e2e)
- Lint/Typecheck: ESLint (typescript-eslint), tsc

## 3) Klasör Yapısı ve Önemli Dosyalar

- `src/app` – Next.js sayfaları ve route’lar (App Router)
  - `dashboard/` – Özet ekranı (istatistikler, son aktiviteler, projeler)
  - `projects/` – Proje akışları
    - `[id]/` – Proje detayları
      - `rfi/` – RFI listesi ve detay akışı
        - `page.tsx` – RFI listeleme (filtre/sıralama)
        - `[rfiId]/page.tsx` – RFI detay, durum, cevaplar, ekler/fotoğraflar
      - `documents/` – Doküman görüntüleme (örnek akış)
      - `entries/` – Kayıt (entry) oluşturma/akış sayfaları
    - `page.tsx` – Projeler listesi
- `src/components` – Yeniden kullanılabilir bileşenler
  - `RfiPhotoGrid/List/Uploader` – RFI fotoğraf ekosistemi (thumbnail, signed URL, silme)
  - `DailyLogPhotoGrid/List/Uploader` – Günlük fotoğrafları
  - `EvidenceUploader/List` – Kanıt ekleme ve listeleme
  - `DashboardCard`, `StatsCard`, `Toast`, `button.tsx` vb.
- `db` – Veritabanı migration’ları ve bundle
  - `migrations/` – Numaralı SQL migration’lar
  - `bundle.sql` – Script ile birleştirilmiş migration çıktısı
  - `DATABASE_MIGRATION_GUIDE.md` – Süreç notları
- `scripts/`
  - `bundle-migrations.mjs` – Migration’ları birleştirir
  - `apply-rfi-fix.mjs`, `import-factors.ts`, `import-baseline-activities.ts` – Yardımcı scriptler
- Konfig
  - `next.config.ts`, `tsconfig.json`, `eslint.config.*`, `tailwind.config.ts`, `vitest.config.ts`, `playwright.config.ts`

## 4) Sayfalar ve Akışlar

### 4.1 Dashboard
- Gösterge kartları: Toplam projeler, son 30 günlük toplam CO2e, toplam kayıt sayısı, kayıt başına ortalama.
- Son Aktiviteler: En son girişler (Entries) – proje adı, aktivite, miktar/birim, CO2e ve tarih.
- Projeler: İlk 4 proje kartı, “Detay” ve “Kayıt Ekle” kısayolları.
- Sayfalama: Projeler bölümünde sayfa/limit parametreleri; footer içinde hizalı.

### 4.2 Projeler
- Liste: Proje adı, açıklama, oluşturulma tarihi.
- Detay/Sekmeler: RFI, Entries, Documents, Daily Logs (gelişime açık), vb.

### 4.3 RFI (Request for Information)
- Liste (`projects/[id]/rfi/page.tsx`):
  - Kolonlar: RFI No (proje bazlı sıra, `rfi_index`), konu, tarih, soran, hedef rol, durum.
  - Filtre: `status=all|open|answered|closed`
  - Sıralama: `sort=created_asc|created_desc|number_asc|number_desc`
  - Mobil/destekleyici layout.
- Detay (`projects/[id]/rfi/[rfiId]/page.tsx`):
  - Başlık: RFI No, oluşturucu ve tarih, mevcut durum badge.
  - Durum güncelleme (compact form): Sadece oluşturucu veya editor/owner görür.
  - Cevaplar bölümü (tek kart):
    - Üstte composer (RFI kapalıysa devre dışı).
    - İlk cevap, açık RFI’yi otomatik “Cevaplandı” yapar (iş kuralı).
    - Liste: Cevap sahibi adı (email prefix), rol etiketi, tarih, içerik, yetkiliyse Güncelle/Sil.
  - Ekler & Fotoğraflar: Thumbnail’lar, signed URL ile gösterim, oluşturucuya özel silme.
- Yeni RFI (`projects/[id]/rfi/new/page.tsx`):
  - RFI kaydı oluşturma formu; kayıt sonrası yönlendirme.

### 4.4 Entries (Kayıtlar)
- Yeni kayıt oluşturma akışı ve aktivitelerle eşleme (örnekler mevcut).
- Emisyon hesaplarının (co2e) özetlere yansıması.

### 4.5 Günlükler (Daily Logs)
- Fotoğraf bileşenleri: Grid/List + Uploader.
- JSON sütunundan path isimleri; signed URL üretimi; silmede JSON’dan çıkarma.

### 4.6 Dokümanlar
- Örnek sayfa yapısı ve görüntüleme yetenekleri (geliştirilebilir).

## 5) Bileşenler ve UI Desenleri

- Fotoğraf Grid/List (RFI/Daily Logs):
  - Signed URL ile önizleme; silme sadece oluşturucu/izinli kullanıcıda aktif.
  - Dosya yolu normalizasyonu: `project-files/` prefix’ini düşürerek storage API ile çalışma.
- Toast sistemi: `window.dispatchEvent(new CustomEvent('app-toast', ...))` ile kullanıcıya geri bildirim.
- Kartlar: “glass”/gradient arka planlar, border ve badge sınıflarıyla tutarlı UI dili.

## 6) Sunucu Aksiyonları (Next.js Server Actions)

- Örnekler: RFI durum güncelleme, RFI yanıt ekleme/düzenleme/silme; Evidence silme.
- Yetki modeli UI’de kontrol edilse bile nihai doğrulama RLS ve server action içinde yapılır.
- Başarısızlıkta güvenli yönlendirme: Hata mesajı querystring’e taşınarak sayfaya dönülür.

## 7) Veritabanı ve RLS (Supabase / Postgres)

### 7.1 Temel Tablolar (örnekler)
- `projects` – Projeler
- `entries` – Kayıtlar (miktar, birim, co2e değerleri, proje bağlantısı)
- `activities` – Aktivite sözlüğü (isim, anahtar vb.)
- `rfi` – RFI kayıtları
  - `rfi_index` (proje bazlı sıra no)
  - `status` (open/answered/closed)
  - `answer_text`, `answered_at`, `due_date`, `photos` (JSON)
- `rfi_responses` – RFI cevapları (thread)
  - `rfi_id`, `body`, `created_by`, `created_at`
- `daily_logs` – Günlükler (ör. `photos` JSON alanı)
- Evidence ile ilişkili tablolar (örn. `evidence_files`) ve diğer domain tabloları

### 7.2 RPC ve Yardımcı Fonksiyonlar
- `get_project_members(project_id)` – Proje üyeleri (user_id, email, role) döner; UI kimliklendirme için kullanılır.
- `is_project_member(user_id, project_id)` – Üyelik kontrolü.
- `is_project_editor(user_id, project_id)` – Editor/owner yetkisi kontrolü.
- `extract_project_from_path(text)`, `extract_second_uuid(text)` – Storage path’lerinden proje/kimlik çıkarımı (RLS için).

### 7.3 RLS Politikaları (Özet)
- Genel: Varsayılan olarak kısıtlayıcı; seçme/ekleme proje üyeleri ile sınırlı.
- Değiştirme/Silme: Kaydı oluşturan veya proje editor/owner rolleri.
- Storage (Buckets: `project-files`, `evidence`):
  - Delete işlemleri path kuralları ve rol kontrolü ile sınırlandırılmıştır.
  - `daily_logs.photos` ve `rfi.photos` JSON alanlarını yalnızca oluşturucular güncelleyebilir.

### 7.4 RFI Numaralandırma
- `rfi_index`: Proje bazlı sıra; trigger ile oluşturulur.
- Eşzamanlılık için advisory lock kullanımı.
- `(project_id, rfi_index)` benzersizliği ve geçmiş veri için backfill migration’ı.

## 8) Migration’lar (db/migrations)

Migration’lar numaralı ve artan sırada; temel başlıklar:
- `001_init.sql` – Şema başlangıcı
- `00x_rpcs.sql` – RPC’ler ve yardımcı fonksiyonlar
- `004_storage_policies.sql` ve takip edenler – Storage/Security
- `005_members.sql` – Üyelik/rol altyapısı
- `006_calc.sql` – Hesaplama fonksiyonları
- `012_activity_seeds.sql`, `017_activity_library_wide.sql` – Aktivite tohumları
- `018_indexes.sql`, `019_search_accents_trgm.sql` – Performans ve arama indeksleri
- `020_factors_unique_idx.sql` – Faktör eşsiz indeksleri
- `021_audit_triggers.sql` – Audit mekanizmaları
- `025_storage_project_files.sql` – Proje dosyaları bucket politikaları
- `026_rfi_extend_and_rls_fix.sql` – RFI alanları ve RLS düzenlemeleri
- `027_daily_logs_structured.sql` – Günlük veri modeli
- `028_documents.sql` (+ notlar/araçlar) – Doküman altyapısı
- `029_construction_core_materials.sql` – Malzeme çekirdek verileri
- `030+` – Birimler/taşıma genişletmeleri ve çeşitli seed/temizlik/düzeltme migration’ları
- `056_restrict_photo_deletes.sql` – Storage delete kısıtlamaları, JSON güncelleme yetkileri
- `057_rfi_numbering_and_responses.sql` – RFI sıra no trigger/backfill, `rfi_responses` tablosu ve RLS

Not: `db/bundle.sql` script tarafından güncel migration’lardan üretilir.

## 9) Fotoğraf/Depolama Akışı

- Path şeması: `project-files/{project_uuid}/...`
- Görüntüleme: Signed URL ile süreli erişim; UI’de thumbnail olarak render edilir.
- Silme:
  - Önce ilgili tablo JSON alanından path çıkarılır (ör. `daily_logs.photos`, `rfi.photos`).
  - Sonra storage objesi silinmeye çalışılır (RLS nedeniyle başarısız olabilir; UI bunu tolere eder).
  - Oluşturucu/izinli kullanıcılar için silme butonu aktif.

## 10) RFI Cevap Akışı (Thread)

- Ekleme: `postResponse` server action – boş metin engellenir; açık RFI’de ilk cevap otomatik “Cevaplandı”.
- Düzenleme/Silme: `updateResponse` ve `deleteResponse` – yalnızca oluşturucu veya editor/owner; RLS de bunu zorlar.
- Kimlik gösterimi: `get_project_members` RPC ile `user_id → email/rol` eşlemesi.
- Kapalı RFI: Composer devre dışı.

## 11) Güvenlik ve Yetkilendirme

- Auth: SSR’da Supabase `createClient` ile kullanıcı alınır; yoksa `/login`’e yönlendirme.
- RLS: Uygulama katmanı kontrolleri ile uyumlu; en son yetki DB tarafında uygulanır.
- Editor/Owner Rolleri: Oluşturucuya ek olarak bakım yetkisi (edit/delete) tanır.

## 12) Görevler, Script’ler ve Geliştirme

- Migration paketleme: `scripts/bundle-migrations.mjs`
- Tip kontrolü: `npm run typecheck`
- Lint: `npm run lint`
- Test: `vitest`, `playwright`

## 13) Performans ve Ölçekleme Notları

- Listelemelerde `limit` ve sayfalama kullanılır (dashboard projeler, RFI listesi).
- DB’de kritik alanlarda indeksler mevcut (ör. `rfi (project_id, rfi_index)` ve created_at sıralamaları).
- Signed URL süreleri makul (örn. 10 dk) tutularak depolama yükü ve yetkisiz erişim dengelenir.

## 14) Edge Case’ler

- RFI numaralandırma eşzamanlı istekler: Advisory lock ile güvence altına alınır.
- Kapalı RFI’ye cevap eklenemez (UI devre dışı, RLS ile de korunmalı).
- Storage silme RLS nedeniyle başarısız olabilir; UI kullanıcıya bildirim verir ama akışı bozmaz.
- JSON sütunlarında path türleri (string vs. obje) normalize edilmiştir; bileşenler her iki formu da destekler.

## 15) Geliştirme İçin Öneriler / Yol Haritası

- RFI’de “Cevabı Düzenle”yi daha UX-dostu (inline toggle) yapmak için küçük butonla aç/kapa.
- Cevap silmede onay diyaloğu.
- Kullanıcı adı/avatarda Supabase user metadata desteği (email prefix yerine gerçek ad).
- RFI cevaplarına dosya/fotoğraf ekleri (opsiyonel alt-attachment sistemi).
- Audit kayıtlarının UI’dan izlenmesi.
- Lint uyarılarını azaltma ve CI entegrasyonu.

## 16) Hızlı Terimler Sözlüğü

- RFI: Request for Information – Saha ve proje paydaşları arasında bilgi talebi süreci.
- RLS: Row Level Security – Postgres seviyesinde satır-bazlı yetkilendirme politikaları.
- Signed URL: Depolama objelerine süreli, yetkili erişim sağlayan URL.
- Advisory Lock: DB içi gönüllü kilit; aynı kaynağa ilişkin eşzamanlı işlemleri sıraya almak için.

---
Bu belge düzenli güncellenebilir. Yeni modüller veya akışlar eklendikçe ilgili bölümlere kısa notlar düşmek, ekip içi bilgi akışını hızlandıracaktır.
