Özellik Geliştirme Rehberi: "Fırsatlar" Sayfası - Faz 1 (Kural Tabanlı Motor)
1. Amaç
Bu geliştirmenin amacı, "Fırsatlar" sayfasının MVP (Minimum Uygulanabilir Ürün) versiyonunu inşa etmektir. Bu özellik, harici bir AI API'si kullanmayacaktır. Bunun yerine, bir projenin veritabanındaki verilerini analiz eden ve kullanıcıya proaktif olarak eyleme geçirilebilir içgörüler ve potansiyel sorunları sunan, sunucu tarafında çalışan, kural tabanlı bir motor olacaktır.

2. Arka Uç (Backend) Mantığı: opportunitiesEngine Fonksiyonu
Projenin beyni bu fonksiyon olacak.

Görev: src/lib/opportunities.ts içinde analyzeProjectForOpportunities(projectId) adında yeni bir sunucu tarafı fonksiyonu oluştur.

Copilot için Talimatlar:

Bu fonksiyon, projectId'yi argüman olarak alacak ve bir Opportunity nesneleri dizisi (array) döndürecektir.

Fonksiyon, ilk olarak verilen projectId için Supabase veritabanındaki tüm emission_entries kayıtlarını çekmelidir.

Ardından, bu veri seti üzerinde aşağıda tanımlanan bir dizi kural kontrolü çalıştırmalıdır. Bir kural tetiklendiğinde, ilgili Opportunity nesnesini oluşturup sonuç dizisine eklemelidir.

Uygulanacak Kurallar:
Kural 1: Yüksek Yoğunlaşma Kuralı

Mantık: Eğer tek bir category'den (örn: 'concrete_c25_30') gelen emisyonların toplamı, projenin toplam emisyonlarının %50'sinden fazlaysa bir fırsat oluştur.

Örnek Çıktı Nesnesi:

TypeScript

{ 
  type: 'CONCENTRATION', 
  title: 'Beton Emisyonu Yoğunlaşması', 
  suggestion: 'Projenizin emisyonlarının %65\'i betondan geliyor. Düşük karbonlu alternatifleri araştırarak büyük bir etki yaratabilirsiniz.',
  metadata: { category: 'concrete_c25_30', percentage: 65 }
}
Kural 2: Kendi Kendine Kıyaslama Kuralı (Trend Analizi)

Mantık: Son 30 günün toplam emisyonları, bir önceki 30 günlük periyodun toplam emisyonlarından %20'den fazla ise bir fırsat oluştur.

Örnek Çıktı Nesnesi:

TypeScript

{
  type: 'TREND_INCREASE',
  title: 'Son Dönemde Emisyon Artışı',
  suggestion: 'Son 30 gündeki emisyonlarınız bir önceki döneme göre %25 arttı. Bu artışın kaynağını Raporlar sayfasından detaylı inceleyebilirsiniz.',
  metadata: { increase_percentage: 25 }
}
Kural 3: Anomali Tespiti Kuralı (Veri Kalitesi)

Mantık: Belirli bir kategorideki (örn: tüm 'beton' kayıtları) emisyon değerlerinin ortalamasını ve standart sapmasını hesapla. Eğer tek bir kayıt, (ortalama + 3 * standart sapma) değerinden daha yüksekse, bunu bir anomali olarak işaretle.

Örnek Çıktı Nesnesi:

TypeScript

{
  type: 'ANOMALY_DETECTED',
  title: 'Potansiyel Hatalı Veri Girişi',
  suggestion: '20 Eylül tarihli \'Beton C25\' kaydınız, projedeki diğer beton girişlerinin ortalamasından 10 kat daha yüksek görünüyor. Bir yazım hatası olabilir mi?',
  metadata: { entry_id: '...' }
}
Kural 4: Statik İpucu Kuralı (En İyi Pratikler)

Mantık: Proje, belirli bir eşik değerden fazla malzeme kullandıysa (örn: toplamda 10 tondan fazla inşaat demiri), statik bir ipucu göster.

Örnek Çıktı Nesnesi:

TypeScript

{
  type: 'BEST_PRACTICE_TIP',
  title: 'Geri Dönüştürülmüş Malzeme Fırsatı',
  suggestion: 'Projenizde çelik kullanımı yüksek. Tedarikçinizle görüşerek geri dönüştürülmüş çelik kullanma opsiyonlarını değerlendirdiniz mi? Bu, malzemenin gömülü karbonunu %70\'e kadar azaltabilir.',
  metadata: { material: 'steel' }
}
3. Opportunity Tipi (TypeScript)
Tutarlılık için, opportunities.ts dosyasının en başında Opportunity nesnesinin tip tanımını yap:

TypeScript

type Opportunity = {
  type: 'CONCENTRATION' | 'TREND_INCREASE' | 'ANOMALY_DETECTED' | 'BEST_PRACTICE_TIP';
  title: string;
  suggestion: string;
  metadata?: any; // Kurala özel ek veriler için
};
4. Arayüz (UI) Uygulaması
Görev: /dashboard/opportunities/page.tsx sayfasında bu fırsatları göster.

Copilot için Talimatlar:

Bu sayfa, kullanıcının o an seçili olan projesi için analyzeProjectForOpportunities fonksiyonunu çağıran bir Sunucu Bileşeni (Server Component) olmalıdır.

Fonksiyondan dönen Opportunity nesneleri dizisi (array) üzerinde bir map işlemi yaparak, her bir fırsatı yeniden kullanılabilir bir <OpportunityCard /> bileşeni kullanarak render etmelidir.

src/components/opportunities/OpportunityCard.tsx adında yeni bir bileşen oluştur. Bu kart, bir Opportunity nesnesini prop olarak almalı ve şu yapıya sahip olmalıdır:

Başlık: Bir ikon ve opportunity.title.

Tespit/Öneri: opportunity.suggestion metni.

Aksiyonlar: [Detayları İncele] ve [Gizle] gibi butonlar.

Kartın tasarımı, opportunity.type'a göre değişebilir (örn: Anomali uyarısı için kırmızı bir kenarlık).