# Sayfalar Rehberi (Projeler, Proje Detay, Kayıt Ekleme, Günlük Ekleme)

Tarih: 20.09.2025

Bu not, uygulamadaki ana sayfa bölümlerinin amacını, içeriklerini ve kullanıcı akışlarını kısa ve anlaşılır bir dille özetler. Odak: Projeler, Proje Detay, Kayıt Ekleme (Entries), Günlük Ekleme (Daily Logs).

---

## 1) Projeler (Projects) Sayfası

Amaç
- Tüm projeleri listelemek, hızlı özet görmek ve detay/ekleme akışlarına geçiş sağlamak.

Öne çıkan içerikler
- Proje Kartları: Proje adı, kısa açıklama/metin, oluşturulma tarihi gibi temel bilgiler.
- Kısayollar: “Detay” (proje sayfasına git) ve “Kayıt Ekle” (ilgili projeye kayıt oluşturma akışını başlat).
- Sayfalama: Kartların altında (kart footer’ında) sayfa/limit kontrolü; hizalamayı bozmamak için kart içine yerleştirilmiştir.

Aksiyonlar
- Proje detayına gitme.
- Seçilen proje için doğrudan kayıt ekleme akışı açma.

Yetkiler ve notlar
- Listeleme, sisteme giriş yapmış ve proje üyesi kullanıcılar için anlamlıdır.
- Bazı projeler kullanıcı üyesi değilse, görünümler kısıtlı olabilir (RLS politikaları uyarınca).

Kullanıcı akışı
1. Projeler sayfasını aç.
2. Kartlardan proje seç; ya “Detay”a git ya da doğrudan “Kayıt Ekle”yi başlat.

---

## 2) Proje Detay Sayfası

Amaç
- Seçilen projenin çalışma alanı: RFI, kayıtlar, günlükler ve belgeler gibi modüllere giriş.

Öne çıkan içerikler
- Başlık/Üst Bilgi: Proje adı, temel meta bilgiler.
- Sekmeler/Alanlar (uygulamada mevcut veya geliştirmeye açık):
  - RFI: Bilgi talebi listesi (filtre/sıralama ile). RFI detayına ve yeni RFI açılışına geçiş.
  - Kayıtlar (Entries): Proje için yapılan emisyon kayıtları (listeleme ve raporlama akışına köprü).
  - Günlükler (Daily Logs): Günlük kayıtları ve fotoğrafları (bileşenler hazır; sayfa akışları projeye göre şekillenebilir).
  - Dokümanlar: Proje dosyaları/dokümanları (geliştirilebilir bir alan).

Aksiyonlar
- RFI listeleme ve detayına gitme; yeni RFI oluşturma.
- Kayıt ekleme akışına geçme.
- Günlük ekleme akışına geçme (varsa).

Yetkiler ve notlar
- Görüntüleme: Proje üyeleri.
- Düzenleme/Silme: Kural olarak kaydı oluşturan kullanıcı veya proje editor/owner.
- RFI özelinde: Durum güncelleme ve cevap ekleme yetkisi, yaratıcı ve editor/owner ile sınırlıdır.

Kullanıcı akışı
1. Projeyi seç ve detay sayfasını aç.
2. İlgili modül sekmesine (RFI/Kayıtlar/Günlükler/Dokümanlar) geç.
3. Modülün içindeki işlem (listele, detay, ekle/düzenle) ile devam et.

---

## 3) Kayıt Ekleme (Entries) Sayfası

Amaç
- Proje kapsamında yeni bir emisyon kaydı oluşturmak ve sisteme dahil etmek.

Öne çıkan içerikler
- Form Alanları: Aktivite seçimi, miktar, birim, proje ilişkisi, opsiyonel açıklamalar.
- Hesaplama: Girilen veri üzerinden CO2e hesaplamaları (arka planda ilgili faktörlerle).
- Geri Bildirim: Başarı/başarısızlık durumunda kullanıcıya net mesajlar.

Aksiyonlar
- Formu doldur, kaydı oluştur.
- Başarılı ise projeye/özet ekrana geri dönüş veya başka bir kayıt eklemeye devam.

Yetkiler ve notlar
- Ekleme: Proje üyesi olmak gerekir.
- Sonradan düzenleme/silme: Genelde kaydı oluşturan kullanıcı veya editor/owner.
- Veriler RLS ile korunur; başka projelere ait kayıtlara erişim engellenir.

Kullanıcı akışı
1. İlgili projeden “Kayıt Ekle” akışını başlat.
2. Aktivite, miktar ve birim gibi bilgileri doldur.
3. Kaydet; geri bildirim mesajını kontrol et.

---

## 4) Günlük Ekleme (Daily Logs) Sayfası

Amaç
- Günlük operasyon kayıtlarını ve fotoğrafları sisteme eklemek.

Öne çıkan içerikler
- Günlük Bilgileri: Tarih, kısa açıklama/notlar, varsa sorumlu kişi.
- Fotoğraf Bölümü: Thumbnail önizlemeleri, signed URL ile güvenli görüntüleme.
- Fotoğraf Silme: Yalnızca günlük kaydını oluşturan kullanıcı (veya yetkili roller) silebilir.

Aksiyonlar
- Günlük bilgilerini doldur ve gönder.
- Fotoğraf yükle (çoklu), önizle, gerekirse JSON listesinden çıkar (sil) ve depodan kaldırmayı dene.

Yetkiler ve notlar
- Görüntüleme: Proje üyeleri.
- Güncelleme/Silme: Günlüğün oluşturucusu veya proje editor/owner.
- Depolama Notu: Silmede önce JSON alanından çıkarma yapılır; depodaki nesnenin silinmesi RLS nedeniyle başarısız olsa bile akış bozulmaz, kullanıcı bilgilendirilir.

Kullanıcı akışı
1. Proje detayından “Günlük Ekle” akışına geç.
2. Günlük metin alanlarını doldur; fotoğrafları yükle.
3. Kaydet ve günlük listesine/özet ekrana dön.

---

## Ortak Tasarım İlkeleri ve İpuçları

- Net İzinler: UI’de butonlar sadece yetkili kullanıcıya gösterilir; asıl güvenlik RLS + sunucu tarafında doğrulanır.
- Tutarlı Geri Bildirim: Form gönderimleri ve dosya işlemlerinde açık mesajlar ve hafif toast’lar.
- Mobil Uyum: Liste ve kart yapıları mobilde okunur olacak şekilde düzenlenmiştir.
- Performans: Listelemelerde sayfalama/limit ve uygun sıralama kullanımı; kritik alanlarda indeksler.

---

Bu sayfa açıklamaları, gerçek ekranlarla uyumlu olacak şekilde sade bir dille hazırlanmıştır. İlgili modüller geliştikçe (ör. Dokümanlar, raporlar) bu not güncellenebilir.