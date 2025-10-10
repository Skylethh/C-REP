"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Building2,
  Download,
  Globe,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Upload,
  Wifi,
} from "lucide-react";

type ToggleProps = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

type ProfileSettingsClientProps = {
  initialDisplayName: string;
  initialJobTitle?: string;
};

function ToggleRow({ label, description, value, onChange }: ToggleProps) {
  return (
    <div className="group flex items-start justify-between gap-4 rounded-xl border border-white/20 bg-gradient-to-br from-emerald-950/60 to-ocean-950/40 px-4 py-3.5 transition-all hover:border-white/25 hover:from-emerald-950/80 hover:to-ocean-950/60 backdrop-blur-sm">
      <div className="flex-1">
        <p className="text-sm font-medium text-white/90">{label}</p>
        {description ? <p className="mt-1 text-xs leading-relaxed text-white/55">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950 ${
          value ? "bg-gradient-to-r from-leaf-500 to-ocean-500 shadow-glow-sm" : "bg-emerald-900/60"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 shadow ${
            value ? "translate-x-[22px]" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

// Improved theming for settings panels - aligned with project theme
const settingsPanelClass = "border border-white/20 bg-gradient-to-br from-emerald-950/60 to-ocean-950/40 backdrop-blur-xl p-6 rounded-xl shadow-2xl transition-all duration-300 hover:border-white/25 hover:from-emerald-950/70 hover:to-ocean-950/50 hover:shadow-glow-sm hover:translate-y-[-2px]";
const settingsInsetClass = "rounded-xl border border-white/25 bg-emerald-950/50 backdrop-blur-md transition-all duration-200 hover:border-white/30";

export default function ProfileSettingsClient({
  initialDisplayName,
  initialJobTitle = "Sürdürülebilirlik Uzmanı",
}: ProfileSettingsClientProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [digestDay, setDigestDay] = useState("friday");

  const [mailNotifications, setMailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [alertsHighEmission, setAlertsHighEmission] = useState(true);

  const [aiAutoInsights, setAiAutoInsights] = useState(true);
  const [aiCacheSharing, setAiCacheSharing] = useState(false);
  const [aiDraftEmails, setAiDraftEmails] = useState(false);

  const [multiFactor, setMultiFactor] = useState(true);
  const [ipRestriction, setIpRestriction] = useState(false);
  const [apiAccess, setApiAccess] = useState(true);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const accentSummary = "Yeşil / Okyanus";
  const digestDayLabel = useMemo(() => {
    switch (digestDay) {
      case "monday":
        return "Pazartesi";
      case "sunday":
        return "Pazar";
      default:
        return "Cuma";
    }
  }, [digestDay]);

  const handleSave = () => {
    setSaveState("saving");
    window.setTimeout(() => {
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 4000);
    }, 900);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Enhanced Header */}
      <header className={`${settingsPanelClass} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-leaf-500/8 via-transparent to-ocean-500/8 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-leaf-400/20 to-ocean-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-leaf-500/20 to-ocean-500/20 px-3 py-1 border border-leaf-400/30 mb-3 shadow-glow-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-leaf-400 shadow-glow-sm animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-leaf-100">Ayarlar</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white leading-tight">
              Hesap ve Tercihler
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70 leading-relaxed">
              Profil bilgilerinizi güncelleyin, bildirim tercihlerinizi yapılandırın ve AI özelliklerini yönetin.
            </p>
          </div>
          <div className={`${settingsInsetClass} px-5 py-4 shadow-xl border-leaf-400/20`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Aktif Tema</p>
            <p className="mt-1.5 text-base font-semibold highlight-text">{accentSummary}</p>
            <p className="mt-1 text-xs text-white/60">{jobTitle}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr,1fr]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Profile Section */}
          <section className={settingsPanelClass}>
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-gradient-to-br from-leaf-500/15 to-ocean-500/15 p-3 border border-white/25 shadow-inner">
                <Building2 className="h-5 w-5 text-leaf-300" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">Profil ve Organizasyon</h2>
                <p className="mt-1 text-sm text-white/60 leading-relaxed">
                  Kimlik bilgilerinizi ve organizasyon ayarlarınızı güncelleyin.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="form-label">Görünen Ad</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="form-input w-full"
                  placeholder="Adınız"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="form-label">Pozisyon</span>
                <input
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  className="form-input w-full"
                  placeholder="Göreviniz"
                />
              </label>
            </div>

            <div className={`${settingsInsetClass} mt-6 px-5 py-4 shadow-lg`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-leaf-400 shadow-glow-sm" />
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Organizasyon Bağlantısı</p>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                <span className="font-medium text-white">Atlas Yapı Holding</span> — Üyeliğiniz doğrulanmış durumda.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
                <span>Aktif davetler:</span>
                <span className="rounded-full bg-leaf-500/20 px-2 py-0.5 font-medium text-leaf-200">5/25</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button 
                type="button" 
                onClick={handleSave} 
                className={`btn-primary transition-all duration-200 ${saveState === "saving" ? "opacity-75" : ""}`}
                disabled={saveState === "saving"}
              >
                {saveState === "saving" ? "Kaydediliyor..." : saveState === "saved" ? "✓ Kaydedildi" : "Değişiklikleri Kaydet"}
              </button>
              {saveState === "saved" ? (
                <span className="text-xs text-leaf-300 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-leaf-400 animate-pulse" />
                  Son kayıt {new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              ) : null}
            </div>
          </section>

          {/* Notifications Section */}
          <section className={settingsPanelClass}>
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-gradient-to-br from-ocean-500/15 to-leaf-500/15 p-3 border border-white/25 shadow-inner">
                <Bell className="h-5 w-5 text-ocean-300" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">Bildirim Tercihleri</h2>
                <p className="mt-1 text-sm text-white/60 leading-relaxed">
                  Kritik güncellemelerden haberdar olmak için bildirim kanallarınızı yapılandırın.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <ToggleRow
                label="E-posta bildirimleri"
                description="Yeni proje davetleri ve günlük log özetlerini e-posta ile alın."
                value={mailNotifications}
                onChange={setMailNotifications}
              />
              <ToggleRow
                label="Slack entegrasyonu"
                description="Gerçek zamanlı uyarıları Slack workspace'inize gönderin."
                value={slackNotifications}
                onChange={setSlackNotifications}
              />
              <ToggleRow
                label="Haftalık sürdürülebilirlik özeti"
                description={`Her ${digestDayLabel} günü, tüm projelerin CO₂ trendini toplayan raporu alın.`}
                value={weeklyDigest}
                onChange={setWeeklyDigest}
              />
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4 pt-4 border-t border-white/25">
                <label className="flex flex-col gap-2">
                  <span className="form-label">Haftalık Rapor Günü</span>
                  <select
                    value={digestDay}
                    onChange={(event) => setDigestDay(event.target.value)}
                    className="form-input w-full"
                    disabled={!weeklyDigest}
                  >
                    <option value="monday">Pazartesi</option>
                    <option value="friday">Cuma</option>
                    <option value="sunday">Pazar</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="form-label">Özet Gönderim Adresi</span>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-white/40" />
                    <input className="form-input w-full" defaultValue="surdurulebilirlik@atlas.com" />
                  </div>
                </label>
              </div>

              <ToggleRow
                label="Yüksek emisyon uyarıları"
                description="24 saat içinde %30+ artış gösteren kategorilerde anlık bildirim."
                value={alertsHighEmission}
                onChange={setAlertsHighEmission}
              />
            </div>
          </section>

          {/* AI Workflows Section */}
          <section className={settingsPanelClass}>
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-gradient-to-br from-leaf-500/15 to-ocean-500/15 p-3 border border-white/25 shadow-inner">
                <Sparkles className="h-5 w-5 text-leaf-300" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">AI İş Akışları</h2>
                <p className="mt-1 text-sm text-white/60 leading-relaxed">
                  AI destekli fırsat analizlerini ve raporları otomatikleştirin.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <ToggleRow
                label="Fırsat analizlerini otomatik üret"
                description="Yeni veri girişi olduğunda AI yorumu otomatik güncellensin."
                value={aiAutoInsights}
                onChange={setAiAutoInsights}
              />
              <ToggleRow
                label="AI sonuçlarını organizasyonla paylaş"
                description="Önbelleğe alınan yorumlar ekip tarafından yeniden kullanılabilir."
                value={aiCacheSharing}
                onChange={setAiCacheSharing}
              />
              <ToggleRow
                label="Müşteri e-postası taslaklarını hazırla"
                description="Haftalık rapor ile birlikte müşteri e-posta metinlerini oluştur."
                value={aiDraftEmails}
                onChange={setAiDraftEmails}
              />

              <div className={`${settingsInsetClass} px-4 py-3.5 mt-4 shadow-lg`}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-leaf-300" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Model Bilgisi</p>
                </div>
                <p className="text-sm text-white/70">
                  <span className="font-medium text-white">llama-3.1-8b-instant</span>
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Security Section */}
          <section className={settingsPanelClass}>
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 p-3 border border-white/25 shadow-inner">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">Veri ve Güvenlik</h2>
                <p className="mt-1 text-sm text-white/60 leading-relaxed">
                  Güvenlik politikalarını ve veri yönetimini yapılandırın.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <ToggleRow
                label="Çok faktörlü kimlik doğrulama"
                description="Giriş sırasında SMS + e-posta doğrulaması kullan."
                value={multiFactor}
                onChange={setMultiFactor}
              />
              <ToggleRow
                label="IP kısıtlama listesi"
                description="Sadece ofis ağından girişlere izin ver."
                value={ipRestriction}
                onChange={setIpRestriction}
              />
              <ToggleRow
                label="API erişimi"
                description="Harici araçların REST API'den veri çekmesine izin ver."
                value={apiAccess}
                onChange={setApiAccess}
              />

              <div className={`${settingsInsetClass} overflow-hidden divide-y divide-white/30 mt-4 shadow-lg`}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                  <Download className="h-4 w-4 text-emerald-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Veri Dışa Aktarım</p>
                    <p className="text-xs text-white/60 truncate">CSV/PDF formatlarında arşivle</p>
                  </div>
                  <button className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 transition hover:border-white/30 hover:bg-white/10 flex-shrink-0">
                    İndir
                  </button>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                  <Upload className="h-4 w-4 text-emerald-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Faktör İçe Aktar</p>
                    <p className="text-xs text-white/60 truncate">Excel/CSV şablonlarıyla ekle</p>
                  </div>
                  <button className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 transition hover:border-white/30 hover:bg-white/10 flex-shrink-0">
                    Şablon
                  </button>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                  <KeyRound className="h-4 w-4 text-emerald-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">SAML / SSO</p>
                    <p className="text-xs text-white/60 truncate">Tek oturum açma yapılandır</p>
                  </div>
                  <button className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 transition hover:border-white/30 hover:bg-white/10 flex-shrink-0">
                    Yönet
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Workspace Section */}
          <section className={settingsPanelClass}>
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-gradient-to-br from-ocean-500/15 to-leaf-500/15 p-3 border border-white/25 shadow-inner">
                <Globe className="h-5 w-5 text-ocean-300" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">Çalışma Alanı</h2>
                <p className="mt-1 text-sm text-white/60 leading-relaxed">
                  Son oturum ve bağlı entegrasyonlarınız.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/25 bg-emerald-950/40 px-4 py-3 hover:border-white/30 hover:bg-emerald-950/60 transition-colors backdrop-blur-sm">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Wifi className="h-4 w-4 text-ocean-300 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm">Son Bağlantı</p>
                    <p className="text-xs text-white/60">Bugün 09:12 — İstanbul</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-800/60 px-2.5 py-1 text-[10px] uppercase tracking-wide text-white/50 whitespace-nowrap">
                  Chrome
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/25 bg-emerald-950/40 px-4 py-3 hover:border-white/30 hover:bg-emerald-950/60 transition-colors backdrop-blur-sm">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <SlidersHorizontal className="h-4 w-4 text-ocean-300 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm">Entegrasyonlar</p>
                    <p className="text-xs text-white/60 truncate">Supabase, Slack, PowerBI</p>
                  </div>
                </div>
                <button className="rounded-md border border-white/25 px-3 py-1 text-[11px] text-white/80 transition hover:border-white/30 hover:bg-emerald-950/60 whitespace-nowrap">
                  Yönet
                </button>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/25 bg-emerald-950/40 px-4 py-3 hover:border-white/30 hover:bg-emerald-950/60 transition-colors backdrop-blur-sm">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Mail className="h-4 w-4 text-ocean-300 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm">Bildirim Kanalları</p>
                    <p className="text-xs text-white/60">E-posta, Slack (beta)</p>
                  </div>
                </div>
                <span className="rounded-full bg-leaf-500/15 px-2.5 py-1 text-[10px] uppercase tracking-wide text-leaf-200 whitespace-nowrap">
                  Aktif
                </span>
              </div>
            </div>
          </section>

          {/* PDF Templates Section */}
          <section className={settingsPanelClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">PDF Rapor Şablonları</h2>
                <p className="mt-1 text-sm text-white/60 leading-relaxed">
                  Marka kimliğine uygun özel PDF görünümleri.
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-leaf-300 flex-shrink-0" />
            </div>
            <div className="mt-4 space-y-2 text-xs text-white/60">
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-leaf-400" />
                Logo: Sağ üst • Yazı tipi: Inter
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-leaf-400" />
                Kapak gradyanı: {accentSummary}
              </p>
              <button className="w-full px-4 py-2 text-sm text-white/80 mt-3 rounded-lg border border-white/20 bg-gradient-to-r from-leaf-500/10 to-ocean-500/10 hover:from-leaf-500/20 hover:to-ocean-500/20 hover:border-white/30 transition-all duration-200">
                Şablonu Düzenle
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
