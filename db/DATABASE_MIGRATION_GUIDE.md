# Database Migration Yönetim Rehberi

Bu dosya karışıklık ve çakışmaları önlemek için database migration'larının nasıl yönetileceğini açıklar.

## 🔴 ACIL DURUM: Şu anda çakışma varsa

**051_complete_database_cleanup.sql** dosyasını SQL Editor'da çalıştırın. Bu:
- Tüm çakışan politikaları temizler
- Bucket'ları kontrol edip eksikleri oluşturur  
- Temiz ve tutarlı politikalar kurar
- Detaylı rapor verir

## 📋 Normal Migration Süreci

### Seçenek 1: Bundle.sql kullanın (Önerilen)
```sql
-- Sadece güncel bundle.sql dosyasını çalıştırın
-- Bu tüm migration'ları sıralı olarak içerir
```

### Seçenek 2: Tek tek migration dosyaları
Eğer bundle.sql kullanmıyorsanız, sadece yeni migration'ları ekleyin:
```sql
-- Örnek: Sadece 052, 053, 054'ü çalıştırın
-- Önceden çalıştırılan dosyaları tekrar çalıştırmayın
```

## ⚠️ YAPMAYIN

❌ Bundle.sql + tek dosyalar birlikte  
❌ Aynı migration'ı birden fazla kez çalıştırma  
❌ Migration sırasını karıştırma  
❌ Migration dosyalarını manuel değiştirme  

## ✅ YAPIN

✅ Her değişiklikten önce backup alın  
✅ Migration'ları sıralı çalıştırın  
✅ Hata alırsanız durdurun ve kontrol edin  
✅ Test ortamında önce deneyin  

## 🛠️ Hata Ayıklama

### "Policy already exists" hatası
```sql
-- Önce temizlik scripti çalıştırın:
-- 051_complete_database_cleanup.sql
```

### "Bucket not found" hatası
```sql
-- Bucket'ların oluşturulduğunu kontrol edin:
SELECT id, name, public FROM storage.buckets;
```

### "RLS policy violation" hatası
```sql
-- Politikaları kontrol edin:
SELECT * FROM pg_policies WHERE schemaname = 'storage';
```

## 📊 Durum Kontrolü

Migration'lardan sonra bunları kontrol edin:

```sql
-- 1. Bucket'lar oluştu mu?
SELECT id, name, public, file_size_limit FROM storage.buckets;

-- 2. Politikalar kuruldu mu?
SELECT policyname, cmd, roles FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 3. Fonksiyonlar çalışıyor mu?
SELECT extract_project_from_path('project-files/123e4567-e89b-12d3-a456-426614174000/test.jpg');
```

## 🎯 Test Senaryoları

Migration'dan sonra bunları test edin:

- [ ] RFI fotoğraf yükleme
- [ ] RFI fotoğraf silme  
- [ ] Günlük fotoğraf yükleme
- [ ] Günlük fotoğraf silme
- [ ] Evidence dosya yükleme
- [ ] Evidence dosya silme
- [ ] Doküman yükleme
- [ ] Doküman silme

## 📞 Yardım

Sorun devam ederse şunları paylaşın:
1. Hangi migration'ları çalıştırdığınız
2. Tam hata mesajı
3. `SELECT * FROM pg_policies WHERE schemaname = 'storage';` çıktısı