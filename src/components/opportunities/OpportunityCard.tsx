"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Sparkles, Loader2, Search, TrendingUp, AlertTriangle, Scale, BarChart3, ChevronDown, Copy, Maximize2, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { Opportunity } from '@/lib/opportunitiesEngine';
import { getAIEnrichmentForOpportunity } from '@/app/actions/opportunities';

type OpportunityCardProps = {
  opportunity: Opportunity;
  projectId: string;
  aiEnabled: boolean;
  className?: string;
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
  COST_CARBON_IMBALANCE: {
    badge: 'border-amber-400/40 bg-amber-500/15 text-amber-50 shadow-glow-sm',
    icon: <Scale className="h-5 w-5 text-amber-300" aria-hidden />,
    accent: 'from-amber-500/20 to-rose-500/10',
    iconWrap: 'bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-white/10',
  },
  BENCHMARK_GAP: {
    badge: 'border-sky-400/40 bg-sky-500/15 text-sky-50 shadow-glow-sm',
    icon: <BarChart3 className="h-5 w-5 text-sky-300" aria-hidden />,
    accent: 'from-sky-500/20 to-indigo-500/10',
    iconWrap: 'bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-white/10',
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
  emissionShare: {
    label: 'Emisyon Payı',
    order: 16,
    format: (value) => formatPercentage(value),
  },
  spendShare: {
    label: 'Bütçe Payı',
    order: 17,
    format: (value) => formatPercentage(value),
  },
  spendLabel: {
    label: 'Tahmini Harcama',
    order: 18,
    format: (value) => ensureString(value),
  },
  emissionKg: {
    label: 'Kategori Emisyonu',
    order: 19,
    format: (value) => formatTons(value),
  },
  peerMedianKg: {
    label: 'Benzer Proje Medyanı',
    order: 20,
    format: (value) => formatTons(value),
  },
  peerAverageKg: {
    label: 'Benzer Proje Ortalaması',
    order: 21,
    format: (value) => formatTons(value),
  },
  deltaPercent: {
    label: 'Fark Oranı',
    order: 22,
    format: (value) => formatPercentage(value),
  },
  peerCount: {
    label: 'Kıyaslanan Proje',
    order: 23,
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

const AI_STORAGE_KEY_PREFIX = 'carbon:opportunity-ai';
const AI_STORAGE_TTL_MS = 1000 * 60 * 60; // 1 saat

type StoredAISuggestion = {
  suggestion: string;
  cachedAt?: string | null;
  source?: 'cache' | 'live' | null;
  storedAt: number;
};

function getStorageKey(projectId: string, opportunityId: string) {
  return `${AI_STORAGE_KEY_PREFIX}:${projectId}:${opportunityId}`;
}

function loadStoredSuggestion(projectId: string, opportunityId: string): StoredAISuggestion | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getStorageKey(projectId, opportunityId);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAISuggestion | null;
    if (!parsed || !parsed.suggestion) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    if (typeof parsed.storedAt !== 'number' || Date.now() - parsed.storedAt > AI_STORAGE_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch (err) {
    try {
      const key = getStorageKey(projectId, opportunityId);
      window.sessionStorage.removeItem(key);
    } catch (cleanupError) {
      console.warn('[opportunities] cleanup after storage parse failed', cleanupError);
    }
    console.warn('[opportunities] stored AI suggestion parse failed', err);
    return null;
  }
}

function persistSuggestion(projectId: string, opportunityId: string, suggestion: string, cachedAt: string | null, source: 'cache' | 'live') {
  if (typeof window === 'undefined') return;
  const payload: StoredAISuggestion = {
    suggestion,
    cachedAt,
    source,
    storedAt: Date.now(),
  };
  try {
    window.sessionStorage.setItem(getStorageKey(projectId, opportunityId), JSON.stringify(payload));
  } catch (err) {
    console.warn('[opportunities] failed to persist AI suggestion', err);
  }
}

export default function OpportunityCard({ opportunity, projectId, aiEnabled, className }: OpportunityCardProps) {
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<'cache' | 'live' | null>(null);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const stored = loadStoredSuggestion(projectId, opportunity.id);

    setAiSuggestion(stored?.suggestion ?? null);
    setAiSource(stored?.source ?? null);
    setCachedAt(stored?.cachedAt ? new Date(stored.cachedAt) : null);
    setError(null);
    setIsLoading(false);
    setCooldownUntil(null);
    setCooldownMessage(null);
    setCopied(false);
    setModalOpen(false);
  }, [opportunity.id, projectId]);





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
        persistSuggestion(projectId, opportunity.id, content, result.cachedAt ?? null, result.source);
        setCooldownUntil(null);
        setCooldownMessage(null);
        setModalOpen(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'AI yorum hazır 🎯', variant: 'success' } }));
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
  const analyzeDisabled = !aiEnabled || isLoading || cooldownActive;

  const handleCopy = async () => {
    if (!aiSuggestion) return;
    try {
      await navigator.clipboard.writeText(aiSuggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'AI yorumu kopyalandı.', variant: 'success' } }));
      }
    } catch (err) {
      console.warn('[opportunities] copy failed', err);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Kopyalama başarısız oldu.', variant: 'error' } }));
      }
    }
  };

  return (
    <div className={twMerge(
      'dashboard-card flex flex-col overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:shadow-glow-md relative',
      className,
    )}>
      <div className={twMerge('flex items-start gap-4 p-6 border-b border-white/10 bg-gradient-to-r', config.accent)}>
        <div className={twMerge('p-3.5 rounded-xl shadow-lg', config.iconWrap)}>{config.icon}</div>
        <div className="flex-1 space-y-2">
          <span className={twMerge('inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full border backdrop-blur-sm', config.badge)}>
            {opportunity.type === 'CONCENTRATION' && 'Yoğunlaşma Uyarısı'}
            {opportunity.type === 'TREND_INCREASE' && 'Trend Artışı'}
            {opportunity.type === 'ANOMALY_DETECTED' && 'Anomali Tespiti'}
            {opportunity.type === 'COST_CARBON_IMBALANCE' && 'Karbon/Maliyet Uyarısı'}
            {opportunity.type === 'BENCHMARK_GAP' && 'Benchmark Farkı'}
          </span>
          <h3 className="text-lg font-semibold text-white leading-tight">{opportunity.title}</h3>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <p className="text-[15px] leading-relaxed text-white/90 whitespace-pre-line">
          {opportunity.suggestion}
        </p>

        <div className="flex flex-col gap-3 p-4 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] transition-all hover:border-white/15 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-start gap-3 min-w-0 sm:items-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-400/30 flex-shrink-0">
              <Sparkles className="h-4 w-4 text-violet-300" aria-hidden />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-semibold text-white">AI Yorumu</span>
              {isLoading ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/20 px-2 py-0.5 text-[11px] font-medium text-violet-200">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  İşleniyor
                </span>
              ) : aiSuggestion ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/20 px-2 py-0.5 text-[11px] font-medium text-violet-200">
                  <span className="inline-block h-1 w-1 rounded-full bg-violet-300" />
                  Hazır
                </span>
              ) : null}
              {aiSuggestion && relativeCached ? (
                <span className="text-[11px] text-white/50 break-words leading-snug">{relativeCached}</span>
              ) : !isLoading && !aiSuggestion ? (
                <span className="text-[11px] text-white/50">Analiz için butona tıklayın</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => aiSuggestion ? setModalOpen(true) : handleAnalyze()}
            disabled={isLoading || cooldownActive}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-400/40 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 px-3 py-2 text-sm font-semibold text-violet-100 transition-all hover:border-violet-400/60 hover:from-violet-500/35 hover:to-fuchsia-500/35 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : aiSuggestion ? (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Görüntüle</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Analiz Et</span>
              </>
            )}
          </button>
        </div>
        {cooldownMessage && (
          <div className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            <span>{cooldownMessage}</span>
          </div>
        )}

        {dataEntries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dataEntries.map((item) => (
              <div
                key={item.key}
                className="data-card min-h-[76px] flex flex-col justify-between p-4 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] hover:from-white/[0.09] hover:to-white/[0.04] transition-all duration-200 shadow-sm"
              >
                <div className="text-xs uppercase tracking-wider text-white/65 font-semibold mb-2">{item.label}</div>
                <div className="text-[15px] font-bold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="text-xs font-medium text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
      </div>

      <div className="px-5 pb-5 mt-auto space-y-3">
        {cooldownMessage && aiEnabled && (
          <div className="text-xs font-medium text-white/70">
            {cooldownMessage}
          </div>
        )}
        {!aiEnabled && (
          <div className="text-xs font-medium text-white/70">
            AI özelliği bu ortamda devre dışı bırakıldı.
          </div>
        )}
      </div>

      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-4xl max-h-[90vh] grid-rows-[auto,minmax(0,1fr),auto] -translate-x-1/2 -translate-y-1/2 gap-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-900 shadow-2xl sm:max-h-[85vh] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/5 px-6 py-5">
              <div className="flex-1">
                <Dialog.Title className="text-xl font-semibold text-white leading-tight">
                  AI Yorumu – {opportunity.title}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-white/60">
                  Fırsat kartındaki AI önerisinin tam metni
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:border-white/30 hover:bg-white/5 hover:text-white"
                  aria-label="Kapat"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="min-h-0 overflow-y-auto px-6 py-6">
              {aiSuggestion ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="whitespace-pre-line text-base leading-relaxed text-white/90">
                    {aiSuggestion}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-sm text-white/60">
                  AI yorumu henüz mevcut değil.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 bg-white/5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-white/50">
                {relativeCached && `Son güncelleme: ${relativeCached}`}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Kopyalandı ✓' : 'Kopyala'}
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzeDisabled}
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-400/40 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 px-4 py-2 text-sm font-semibold text-violet-50 transition hover:border-violet-400/60 hover:from-violet-500/30 hover:to-fuchsia-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Yeniden Analiz Et
                </button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    Kapat
                  </button>
                </Dialog.Close>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
