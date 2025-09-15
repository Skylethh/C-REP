C-rep

Modern, çok-tenant karbon emisyon raporlama uygulaması.

Kurulum

1) Bağımlılıklar:

```bash
npm install
```

2) .env.local:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SENTRY_DSN=
```

3) Supabase SQL: `db/migrations` klasöründeki dosyaları sırayla uygulayın (001 → 016).

4) Storage: `evidence` bucket (private) oluşturun.

Geliştirme

```bash
npm run dev
```

Testler

- Unit: hesaplama yardımcıları (faktör seçimi ve birim dönüşüm)
- Çalıştırma:

```bash
npm run test
```

Tohum/Seed (öneri)

- `007_seeds.sql` temel birimler, dönüşümler ve örnek emisyon faktörleri içerir.
- İhtiyacınıza göre ek faktörler ve `unit_conversions` satırları ekleyin (özellikle yakıt L→kg gibi senaryolar için).

Önemli Notlar

- Organizasyon arayüzü (OrgMenu, /org) kaldırıldı. Uygulama tek aktif organizasyon cookie’si ile çalışır; ilk girişte default org otomatik oluşturulur.
- Tüm CRUD işlemleri Supabase RLS politikalarına dayanır. Üyeler yalnızca yetkili oldukları proje verilerine erişir; kanıt dosyaları `evidence/{project_id}/…` altında saklanır ve storage policy ile korunur.

Hızlı Başlangıç

1) Proje Oluştur: Dashboard → “Yeni Proje” (zod doğrulama + sanitize)
2) Kayıt Ekle: Proje sayfasında Yeni Kayıt (aktivite seçimi opsiyonel). CO2e şu akışla hesaplanır:
   - Aktiviteye bağlı faktör eşlemesi (varsa), aksi halde kategori/region=global en güncel faktör
   - Gerekirse `unit_conversions` ile normalize → faktör ile çarpım
3) Kanıt Ekle: Her kayıt altında dosya yükleyin (SHA‑256 ile isimlendirme, storage + DB insert). RLS storage policy erişimi sınırlar.
4) CSV Dışa Aktar: Proje sayfasındaki dışa aktar bağlantısı mevcut filtreleri uygular.

Hata/Toast Bildirimleri

- Proje oluştur/güncelle/sil ve kanıt yükleme işlemlerinde başarı/hata mesajları ekranda toast olarak gösterilir.

Dağıtım

Vercel + Supabase. Prod’da RLS ve storage policy’leri test edin. Ortam değişkenlerini Vercel projesine ekleyin.


