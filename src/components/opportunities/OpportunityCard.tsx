"use client";

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, Search, TrendingUp, AlertTriangle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { Opportunity } from '@/lib/opportunitiesEngine';
import { getAIEnrichmentForOpportunity } from '@/app/actions/opportunities';

type OpportunityCardProps = {
  opportunity: Opportunity;
  projectId: string;
  aiEnabled: boolean;
  className?: string;
  detailsHref?: string;
};

const TYPE_STYLES: Record<Opportunity['type'], {
  badge: string;
  icon: JSX.Element;
  accent: string;
  iconWrap: string;
}> = {
  CONCENTRATION: {
    badge: 'border-leaf-400/40 bg-leaf-500/15 text-leaf-50 shadow-glow-sm',
    icon: <Search className="h-5 w-5 text-leaf-300" aria-hidden />,
    accent: 'from-leaf-500/20 to-ocean-500/10',
    iconWrap: 'bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10',
  },
  TREND_INCREASE: {
    badge: 'border-ocean-400/40 bg-ocean-500/15 text-ocean-50 shadow-glow-sm',
    icon: <TrendingUp className="h-5 w-5 text-ocean-300" aria-hidden />,
    accent: 'from-ocean-500/20 to-leaf-500/10',
    iconWrap: 'bg-gradient-to-br from-ocean-500/20 to-leaf-500/20 border border-white/10',
  },
  ANOMALY_DETECTED: {
    badge: 'border-red-400/40 bg-red-500/15 text-red-50',
    icon: <AlertTriangle className="h-5 w-5 text-red-300" aria-hidden />,
    accent: 'from-red-500/20 to-orange-500/10',
    iconWrap: 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-white/10',
  },
};

type DataPresenter = {
  label: string;
  order: number;
  format: (value: unknown) => string | null;
};

const DATA_PRESENTERS: Record<string, DataPresenter> = {
  category: {
    label: 'Kategori',
    order: 1,
    format: (value) => ensureString(value),
  },
  percentage: {
    label: 'Kategori Payı',
    order: 2,
    format: (value) => formatPercentage(value),
  },
  categoryTotalKg: {
    label: 'Kategori Toplamı',
    order: 3,
    format: (value) => formatTons(value),
  },
  projectTotalKg: {
    label: 'Proje Toplamı',
    order: 4,
    format: (value) => formatTons(value),
  },
  windowDays: {
    label: 'Analiz Penceresi',
    order: 5,
    format: (value) => formatNumber(value, { suffix: ' gün' }),
  },
  currentTotalKg: {
    label: 'Son Dönem Toplamı',
    order: 6,
    format: (value) => formatTons(value),
  },
  previousTotalKg: {
    label: 'Önceki Dönem Toplamı',
    order: 7,
    format: (value) => formatTons(value),
  },
  increasePercentage: {
    label: 'Artış Oranı',
    order: 8,
    format: (value) => formatPercentage(value),
  },
  entryId: {
    label: 'Kayıt Numarası',
    order: 9,
    format: (value) => ensureString(value),
  },
  date: {
    label: 'Kayıt Tarihi',
    order: 10,
    format: (value) => formatDate(value),
  },
  ratio: {
    label: 'Ortalama Çarpanı',
    order: 11,
    format: (value) => formatNumber(value, { suffix: ' kat', maximumFractionDigits: 1 }),
  },
  valueKg: {
    label: 'Kayıt Değeri',
    order: 12,
    format: (value) => formatTons(value),
  },
  meanKg: {
    label: 'Kategori Ortalaması',
    order: 13,
    format: (value) => formatTons(value),
  },
  thresholdKg: {
    label: 'İstatistiksel Eşik',
    order: 14,
    format: (value) => formatTons(value),
  },
  sampleSize: {
    label: 'Karşılaştırılan Kayıt',
    order: 15,
    format: (value) => formatNumber(value, { suffix: ' adet', maximumFractionDigits: 0 }),
  },
};

function ensureString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function formatNumber(value: unknown, options?: { suffix?: string; maximumFractionDigits?: number }): string | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  const formatter = new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
  });
  const formatted = formatter.format(numeric);
  return options?.suffix ? `${formatted}${options.suffix}` : formatted;
}

function formatTons(value: unknown): string | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  const tons = numeric / 1000;
  return `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(tons)} ton CO₂e`;
}

function formatPercentage(value: unknown): string | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return `%${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(numeric)}`;
}

function formatDate(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toLocaleDateString('tr-TR');
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) {
      return parsed.toLocaleDateString('tr-TR');
    }
    return value;
  }
  return null;
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const seconds = Math.max(1, Math.round(Math.abs(diffMs) / 1000));
  const suffix = diffMs >= 0 ? 'önce' : 'sonra';
  if (seconds < 60) return `${seconds} saniye ${suffix}`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} dakika ${suffix}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat ${suffix}`;
  const days = Math.round(hours / 24);
  return `${days} gün ${suffix}`;
}

export default function OpportunityCard({ opportunity, projectId, aiEnabled, className, detailsHref }: OpportunityCardProps) {
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<'cache' | 'live' | null>(null);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);

  useEffect(() => {
    setAiSuggestion(null);
    setAiSource(null);
    setCachedAt(null);
    setError(null);
    setIsLoading(false);
    setCooldownUntil(null);
    setCooldownMessage(null);
  }, [opportunity.id]);

  useEffect(() => {
    if (!cooldownUntil) return undefined;
    const diff = cooldownUntil.getTime() - Date.now();
    if (diff <= 0) {
      setCooldownUntil(null);
      setCooldownMessage(null);
      return undefined;
    }
    const timer = setTimeout(() => {
      setCooldownUntil(null);
      setCooldownMessage(null);
    }, diff);
    return () => clearTimeout(timer);
  }, [cooldownUntil]);

  const dataEntries = useMemo(() => {
    return Object.entries(opportunity.data ?? {})
      .map(([key, raw]) => {
        const presenter = DATA_PRESENTERS[key];
        if (!presenter) return null;
        const value = presenter.format(raw);
        if (!value) return null;
        return {
          key,
          label: presenter.label,
          value,
          order: presenter.order,
        };
      })
      .filter((item): item is { key: string; label: string; value: string; order: number } => Boolean(item))
      .sort((a, b) => a.order - b.order);
  }, [opportunity.data]);

  const description = aiSuggestion ?? opportunity.suggestion;
  const isEnriched = Boolean(aiSuggestion);
  const cooldownActive = cooldownUntil ? cooldownUntil.getTime() > Date.now() : false;

  const handleAnalyze = async () => {
    if (!aiEnabled) return;
    if (isLoading || cooldownActive || (aiSuggestion && aiSource === 'live')) return;
    setIsLoading(true);
    setError(null);
    setCooldownMessage(null);
    try {
      const result = await getAIEnrichmentForOpportunity(opportunity, projectId);
      if (result.success) {
        const content = result.suggestion.trim();
        setAiSuggestion(content);
        setAiSource(result.source);
        setCachedAt(result.cachedAt ? new Date(result.cachedAt) : null);
        setCooldownUntil(null);
        setCooldownMessage(null);
        if (typeof window !== 'undefined') {
          const message = result.source === 'cache' ? 'AI önerisi önbellekten getirildi.' : 'AI yorum hazır 🎯';
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, variant: 'success' } }));
        }
      } else {
        if (result.reason === 'cooldown') {
          setCooldownMessage(result.error);
          setCooldownUntil(result.retryAt ? new Date(result.retryAt) : null);
          setError(null);
        } else {
          setError(result.error);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: result.error, variant: 'error' } }));
        }
      }
    } catch (err) {
      console.error('[opportunities] ai analyze failed', err);
      const fallback = 'AI analizi şu anda tamamlanamadı.';
      setError(fallback);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: fallback, variant: 'error' } }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const config = TYPE_STYLES[opportunity.type];
  const relativeCached = cachedAt ? formatRelativeTime(cachedAt) : null;
  const analyzeLabel = aiEnabled
    ? aiSuggestion && aiSource === 'cache'
      ? 'Yeniden Çalıştır'
      : 'AI ile Yorumla'
    : 'AI Kapalı';
  const analyzeDisabled = !aiEnabled || isLoading || cooldownActive || (aiSuggestion !== null && aiSource === 'live');

  return (
    <div className={twMerge(
      'dashboard-card flex flex-col overflow-hidden transition-all duration-300 hover:translate-y-[-2px]',
      className,
    )}>
      <div className={twMerge('flex items-start gap-4 p-5 border-b border-white/10 bg-gradient-to-r', config.accent)}>
        <div className={twMerge('p-3 rounded-xl shadow-inner', config.iconWrap)}>{config.icon}</div>
        <div className="flex-1 space-y-2">
          <span className={twMerge('inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full border backdrop-blur-sm', config.badge)}>
            {opportunity.type === 'CONCENTRATION' && 'Yoğunlaşma Uyarısı'}
            {opportunity.type === 'TREND_INCREASE' && 'Trend Artışı'}
            {opportunity.type === 'ANOMALY_DETECTED' && 'Anomali Tespiti'}
          </span>
          <h3 className="text-lg font-semibold text-white leading-tight">{opportunity.title}</h3>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div
          className={twMerge(
            'leading-relaxed min-h-[80px] rounded-xl border px-4 py-3 text-sm whitespace-pre-line transition-all',
            isEnriched
              ? 'border-leaf-400/40 bg-gradient-to-br from-leaf-500/15 to-ocean-500/10 text-white shadow-glow-sm'
              : 'border-white/10 bg-white/5 text-white/85'
          )}
        >
          {isEnriched && (
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-leaf-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {aiSource === 'cache' ? 'AI Önerisi (Önbellek)' : 'AI Önerisi'}
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center gap-2 text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span>AI analizi hazırlanıyor…</span>
            </div>
          ) : (
            description
          )}
        </div>
        {relativeCached && aiSource === 'cache' && (
          <div className="text-xs text-leaf-100/70">
            Son AI yorumu {relativeCached} kaydedildi.
          </div>
        )}

        {dataEntries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dataEntries.map((item) => (
              <div
                key={item.key}
                className="data-card min-h-[70px] flex flex-col justify-between"
              >
                <div className="text-xs uppercase tracking-wide text-white/60 font-medium">{item.label}</div>
                <div className="mt-1.5 text-sm font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="text-xs font-medium text-red-300">{error}</div>}
      </div>

      <div className="p-5 pt-0 mt-auto">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAnalyze}
            disabled={analyzeDisabled}
            className="btn-primary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {analyzeLabel}
          </button>

          {detailsHref && (
            <a
              href={detailsHref}
              className="btn-secondary inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white/80 hover:text-white"
            >
              Projeyi Aç
          {cooldownMessage && (
            <div className="mt-3 text-xs font-medium text-white/70">
              {cooldownMessage}
            </div>
          )}
            </a>
          )}
        </div>
        {cooldownMessage && aiEnabled && (
            <div className="mt-3 text-xs font-medium text-white/70">
              {cooldownMessage}
            </div>
          )}
        {!aiEnabled && (
          <div className="mt-3 text-xs font-medium text-white/70">
            AI özelliği bu ortamda devre dışı bırakıldı.
          </div>
        )}
      </div>
    </div>
  );
}
