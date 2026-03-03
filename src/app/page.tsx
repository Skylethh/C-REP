import {
  Leaf, BarChart2, Shield, Globe, LineChart,
  FileCheck, Users, ChevronRight, Mail, Phone,
  MapPin, Linkedin, Instagram,
  Award, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import LeadForm from '@/components/lead-form';

export default async function Page() {
  // Check if user is logged in, redirect to dashboard if they are
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-leaf-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -left-20 w-80 h-80 bg-ocean-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-60 h-60 bg-sky-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <section className="pt-2 pb-16 md:pt-4 md:pb-24 overflow-hidden">
        <div className="app-container">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Hero Content */}
            <div className="lg:w-1/2 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
                <span className="bg-gradient-to-r from-leaf-400 to-ocean-400 rounded-full w-2 h-2 animate-pulse"></span>
                <span>Seçkin Sanayi Ortakları İçin Kapalı Beta</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Karbon <span className="highlight-text">Emisyonlarınızı</span> Profesyonelce Yönetin
              </h1>

              <p className="text-lg text-white/70 max-w-2xl">
                C-REP, kuruluşunuzun karbon ayak izini proje bazında takip etmenizi, hesaplamanızı ve raporlamanızı sağlayan profesyonel bir platformdur.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="#demo-form">
                  <Button size="lg" className="w-full sm:w-auto btn-primary">
                    <ChevronRight size={16} className="mr-2" />
                    Demo Talep Et
                  </Button>
                </a>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto btn-secondary">
                    Giriş Yap
                  </Button>
                </Link>
              </div>

              <div className="pt-8 flex flex-col sm:flex-row items-center sm:justify-start gap-6 text-sm text-white/70 sm:pl-0">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-leaf-400 to-ocean-400 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span>Kolay Kullanım</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-leaf-400 to-ocean-400 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span>Güvenli Veri Saklama</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-leaf-400 to-ocean-400 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span>ISO 14064 Uyumlu</span>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="lg:w-1/2 relative">
              <div className="glass p-4 md:p-6 rounded-2xl overflow-hidden">
                <div className="aspect-[4/3] rounded-lg bg-gradient-mesh flex items-center justify-center relative">
                  {/* Dashboard mockup */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full max-w-md bg-gradient-to-br from-emerald-900/90 to-ocean-900/90 rounded-lg p-4 shadow-glow-md">
                      <div className="h-4 w-24 bg-white/20 rounded mb-4"></div>
                      <div className="flex gap-4 mb-6">
                        <div className="h-24 w-1/2 bg-white/10 rounded"></div>
                        <div className="h-24 w-1/2 bg-white/10 rounded"></div>
                      </div>
                      <div className="h-32 bg-white/10 rounded mb-4"></div>
                      <div className="flex gap-2">
                        <div className="h-8 w-8 rounded-full bg-leaf-500/50"></div>
                        <div className="h-8 w-8 rounded-full bg-ocean-500/50"></div>
                        <div className="h-8 w-8 rounded-full bg-sky-500/50"></div>
                      </div>
                    </div>
                  </div>

                  {/* Floating elements */}
                  <div className="absolute top-8 right-12 w-12 h-12 bg-leaf-500/20 rounded-lg animate-float"></div>
                  <div className="absolute bottom-12 left-8 w-10 h-10 bg-ocean-500/20 rounded-lg animate-float-slow"></div>
                  <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-sky-500/20 rounded-lg animate-float-fast"></div>
                </div>
              </div>

              {/* Decorative Element */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
                <div className="glass px-6 py-3 rounded-xl shadow-glow-md flex items-center gap-3 border border-white/20 whitespace-nowrap">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-leaf-400 to-ocean-400"></div>
                  <div className="text-sm font-medium text-white">Profesyonel Karbon Yönetimi</div>
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-leaf-400 to-ocean-400"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-6">
        <div className="app-container">
          <div className="glass p-4 md:p-6 rounded-2xl max-w-2xl mx-auto text-center border border-yellow-500/20 bg-yellow-500/5">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Award size={28} className="text-yellow-400 shrink-0" />
              <div>
                <p className="text-sm md:text-base font-semibold text-white">
                  🏆 Boğaziçi Üniversitesi Bright Master Class Kuluçka Programı <span className="highlight-text">Birincisi</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-20">
        <div className="app-container">
          <div className="text-center mb-12">
            <h2 className="section-title">
              Profesyonel <span className="highlight-text">Özellikler</span>
            </h2>
            <p className="section-subtitle">
              C-REP, karbon emisyonlarınızı yönetmek için ihtiyacınız olan tüm profesyonel araçları sunar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Feature 1 */}
            <div className="glass-card">
              <div className="feature-icon">
                <BarChart2 size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Detaylı Raporlama</h3>
              <p className="text-white/70">
                Enerji, ulaşım ve malzeme kaynaklı emisyonlarınızı proje bazında takip edin ve profesyonel raporlar oluşturun.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card">
              <div className="feature-icon">
                <LineChart size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Trend Analizi</h3>
              <p className="text-white/70">
                Emisyon verilerinizi zaman içinde analiz edin, trendleri belirleyin ve gelecek tahminleri yapın.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card">
              <div className="feature-icon">
                <FileCheck size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Belge Yönetimi</h3>
              <p className="text-white/70">
                Emisyon verilerinizi destekleyen belgeleri güvenle saklayın ve gerektiğinde kolayca erişin.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card">
              <div className="feature-icon">
                <Users size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Ekip İş Birliği</h3>
              <p className="text-white/70">
                Ekip üyelerinizi projelere davet edin ve rol bazlı erişim ile veri güvenliğini sağlayın.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-card">
              <div className="feature-icon">
                <Globe size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Yapay Zeka Destekli Analiz</h3>
              <p className="text-white/70">
                AI motorumuz emisyon verilerinizi analiz eder, azaltım fırsatlarını belirler ve stratejik öneriler sunar.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-card">
              <div className="feature-icon">
                <Shield size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Veri Güvenliği</h3>
              <p className="text-white/70">
                En yüksek güvenlik standartlarıyla verileriniz korunur ve gizliliğiniz sağlanır.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-leaf-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="app-container relative z-10">
          <div className="text-center mb-16">
            <h2 className="section-title">
              Nasıl <span className="highlight-text">Çalışır?</span>
            </h2>
            <p className="section-subtitle">
              C-REP ile karbon emisyonlarınızı yönetmek çok kolay
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* Step 1 */}
              <div className="glass p-6 text-center relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-leaf-500 to-ocean-500 flex items-center justify-center font-bold text-white">
                  1
                </div>
                <div className="pt-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-4">
                    <Users size={28} className="text-leaf-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Demo Talep Edin</h3>
                  <p className="text-white/70 text-sm">
                    İletişim formunu doldurun, size en kısa sürede dönüş yapalım.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="glass p-6 text-center relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-leaf-500 to-ocean-500 flex items-center justify-center font-bold text-white">
                  2
                </div>
                <div className="pt-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-4">
                    <BarChart2 size={28} className="text-leaf-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Verileri Girin</h3>
                  <p className="text-white/70 text-sm">
                    Emisyon verilerinizi kolayca girin ve kanıtlarınızı yükleyin.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="glass p-6 text-center relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-leaf-500 to-ocean-500 flex items-center justify-center font-bold text-white">
                  3
                </div>
                <div className="pt-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-4">
                    <LineChart size={28} className="text-leaf-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Raporları Alın</h3>
                  <p className="text-white/70 text-sm">
                    Otomatik oluşturulan profesyonel raporlarla emisyonlarınızı analiz edin.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <a href="#demo-form">
                <Button className="btn-primary">
                  <span>Demo Talep Et</span>
                  <ChevronRight size={16} />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Request Form Section */}
      <section id="demo-form" className="py-16">
        <div className="app-container">
          <div className="glass p-8 md:p-12 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 mb-4">
                <Sparkles size={28} className="text-leaf-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Erken Erişim <span className="highlight-text">Talep Edin</span>
              </h2>
              <p className="text-white/70">
                C-REP şu anda seçkin sanayi ortakları için kapalı beta aşamasındadır. Demo talep etmek için aşağıdaki formu doldurun.
              </p>
            </div>

            <LeadForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="py-12 border-t border-white/10">
        <div className="app-container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12">
            {/* Company */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-gradient-to-br from-leaf-400 to-ocean-400 p-1.5 rounded-lg">
                  <Leaf className="text-white" size={20} />
                </div>
                <span className="font-semibold text-xl tracking-tight">
                  <span className="highlight-text">C-REP</span>
                </span>
              </div>
              <p className="text-white/70 text-sm mb-4">
                Profesyonel karbon emisyonu yönetim platformu. Sürdürülebilir bir gelecek için veri odaklı çözümler.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">
                  <Linkedin size={18} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">
                  <Instagram size={18} />
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-lg font-medium mb-4">Hızlı Bağlantılar</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="footer-link">Özellikler</a></li>
                <li><a href="#how-it-works" className="footer-link">Nasıl Çalışır</a></li>
                <li><a href="#demo-form" className="footer-link">Demo Talep Et</a></li>
                <li><a href="#footer" className="footer-link">İletişim</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-medium mb-4">Yasal</h3>
              <ul className="space-y-2">
                <li><span className="footer-link cursor-default">Gizlilik Politikası</span></li>
                <li><span className="footer-link cursor-default">KVKK</span></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-medium mb-4">İletişim</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-leaf-400 shrink-0 mt-1" />
                  <span className="text-white/70">Maslak, Sarıyer, İstanbul, Türkiye</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-leaf-400 shrink-0" />
                  <a href="mailto:crep.iletisim@gmail.com" className="footer-link">crep.iletisim@gmail.com</a>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-leaf-400 shrink-0" />
                  <a href="tel:+905063633853" className="footer-link">+90 506 363 38 53</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/50 text-sm">
              &copy; {new Date().getFullYear()} C-REP. Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <a href="#features" className="text-white/50 hover:text-white/70 text-sm">Özellikler</a>
              <a href="#demo-form" className="text-white/50 hover:text-white/70 text-sm">Demo Talep Et</a>
              <a href="mailto:crep.iletisim@gmail.com" className="text-white/50 hover:text-white/70 text-sm">İletişim</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}