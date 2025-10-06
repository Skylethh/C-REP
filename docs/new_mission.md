Elbette. "Fırsatlar" sayfasının, en son konuştuğumuz, kullanıcı kontrolünü ve şeffaflığı merkeze alan, son ve en detaylı versiyonu için kapsamlı bir proje tarifi (prompt) hazırladım.

Bu tarif, projenin beynini oluşturacak kural tabanlı motoru ve bu motorun bulgularını zenginleştirecek olan, kullanıcı tarafından tetiklenen yapay zeka katmanını bir bütün olarak ele alır.

Copilot için Proje Tarifi: Akıllı "Fırsatlar" Sayfası (Kullanıcı Tetiklemeli AI ile)
(Aşağıdaki metnin tamamını kopyalayabilirsin)

Özellik Geliştirme Rehberi: Akıllı "Fırsatlar" Sayfası (Kullanıcı Tetiklemeli AI Zenginleştirmesi ile)
1. Amaç ve Temel İlkeler
Amaç: Kullanıcının proje verilerini proaktif olarak analiz eden bir "Fırsatlar" sayfası inşa etmek. Bu sayfa, önce yerel bir kural motoruyla potansiyel fırsatları belirleyecek, ardından kullanıcının isteği üzerine bu bulguları bir Büyük Dil Modeli (LLM) ile zenginleştirerek, onlara eyleme geçirilebilir, derinlemesine içgörüler sunacak.

Temel İlkeler:

Kullanıcı Kontrolü: Yapay zeka, kullanıcıdan habersiz, arka planda çalışmayacak. Her AI analizi, kullanıcı tarafından, spesifik bir kart için tetiklenecektir.

Şeffaflık: Kullanıcı, bir AI işleminin ne zaman başladığını ve bittiğini net bir şekilde görecektir.

Verimlilik: Sayfa ilk başta hızlı yüklenecek. API çağrıları sadece gerçekten ihtiyaç duyulduğunda yapılacaktır.

2. Genel İş Akışı
Kullanıcı /dashboard/opportunities sayfasına gider. Sayfa, kural tabanlı motorun ürettiği basit fırsat kartlarıyla anında yüklenir.

Kullanıcı, ilgisini çeken bir kart görür.

Kullanıcı, o kartın içindeki ✨ AI ile Yorumla gibi bir butona tıklar.

Sadece o kartın içinde bir yükleme animasyonu (spinner) belirir.

Birkaç saniye sonra, o kartın içeriği, AI tarafından üretilen detaylı ve zenginleştirilmiş metinle güncellenir.

3. Bölüm A: Kural Tabanlı Motor (Temel Katman)
Bu, sayfanın temel zekasını oluşturur.

Görev: src/lib/opportunitiesEngine.ts içinde analyzeProjectForOpportunities(projectId) adında bir sunucu tarafı fonksiyonu oluştur.

Copilot için Talimatlar:

Bu fonksiyon, bir projectId alacak ve bir Opportunity nesneleri dizisi (array) döndürecektir.

Supabase'den ilgili proje için tüm emission_entries kayıtlarını çekmelidir.

Aşağıdaki kuralları uygulayarak fırsatları tespit etmelidir:

Yoğunlaşma Kuralı: Tek bir kategorinin emisyonları, toplamın %50'sinden fazlaysa bir fırsat oluştur.

Trend Artışı Kuralı: Son 30 günün emisyonları, bir önceki 30 güne göre %20'den fazla arttıysa bir fırsat oluştur.

Anomali Tespiti Kuralı: Bir kategorideki tek bir kayıt, o kategorinin ortalamasının 3 standart sapmasından daha yüksekse, bunu bir anomali olarak işaretle.

Opportunity tipini şu şekilde tanımla:

TypeScript

type Opportunity = {
  id: string; // Benzersiz bir kimlik (örn: crypto.randomUUID())
  type: 'CONCENTRATION' | 'TREND_INCREASE' | 'ANOMALY_DETECTED';
  title: string;
  // Bu artık basit ve statik bir öneri olacak
  suggestion: string; 
  data: Record<string, any>; // AI'a gönderilecek ham veriler
};
4. Bölüm B: Yapay Zeka Zenginleştirme Katmanı
Bu, kullanıcı tarafından tetiklenen "sihirli" kısımdır.

Görev: İsteğe bağlı AI analizi için bir Server Action oluştur.

Copilot için Talimatlar:

src/app/actions/opportunities.ts içinde getAIEnrichmentForOpportunity(opportunity: Opportunity) adında yeni bir Server Action oluştur.

Bu fonksiyon, tek bir Opportunity nesnesi alacak.

İçinde, opportunity.type'a göre bir switch ifadesi kullanarak, Groq API'si için özel bir prompt oluşturacak.

Örnek Prompt (CONCENTRATION tipi için):

You are a sustainability consultant for the Turkish construction industry. A project's analysis shows that {opportunity.data.percentage}% of its emissions come from {opportunity.data.category}. In simple Turkish, explain why this is a key area to focus on and suggest a clear, actionable next step for the project manager.
Fonksiyon, Groq API'sini çağıracak ve AI tarafından üretilen metni bir string olarak döndürecektir.

5. Bölüm C: Arayüz (UI) Uygulaması
Bu bölüm, yukarıdaki iki mantığı bir araya getirir.

Görev: /dashboard/opportunities/page.tsx sayfasını ve interaktif kart bileşenini oluştur.

Copilot için Talimatlar:

1. Ana Sayfa (.../opportunities/page.tsx):

Bu sayfa bir Sunucu Bileşeni (Server Component) olmalıdır.

Sayfa yüklendiğinde, analyzeProjectForOpportunities fonksiyonunu çağırarak basit ve ham fırsatları almalıdır.

Bu fırsatlar dizisi üzerinde map yaparak, her biri için bir <OpportunityCard /> bileşenini render etmelidir.

2. İnteraktif Kart Bileşeni (src/components/opportunities/OpportunityCard.tsx):

Bu bileşen, state yöneteceği için bir "use client" bileşeni olmalıdır.

State Yönetimi:

useState<string | null>(null) ile aiSuggestion adında bir state tutmalıdır.

useState<boolean>(false) ile isLoading adında bir state tutmalıdır.

Tetikleyici (Trigger): Kartın içinde, ✨ AI ile Yorumla metnine sahip bir Button olmalıdır. Bu buton, isLoading true ise veya aiSuggestion zaten doluysa devre dışı (disabled) olmalıdır.

Aksiyon (Action): Butonun onClick olayı, getAIEnrichmentForOpportunity server action'ını, kartın kendi opportunity prop'unu göndererek çağırmalıdır. Çağrı yapmadan önce isLoading'i true yapmalıdır.

Görüntüleme Mantığı:

Başlangıçta: aiSuggestion null iken, kart prop'tan gelen basit ve statik opportunity.suggestion metnini göstermelidir.

Yüklenirken: isLoading true olduğunda, metin alanında bir "spinner" veya "skeleton loader" göstermelidir.

Sonuç Geldiğinde: Server action'dan aiSuggestion metni döndüğünde, bu metni state'e kaydetmeli, isLoading'i false yapmalı ve artık basit metin yerine bu yeni, zenginleştirilmiş AI metnini göstermelidir.