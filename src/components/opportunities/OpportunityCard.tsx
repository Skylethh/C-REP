"use client";

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { twMerge } from 'tailwind-merge';
import { Lightbulb, TrendingUp, AlertTriangle, Leaf, Loader2 } from 'lucide-react';
import { Button } from '@/components/button';
import type { Opportunity } from '@/lib/opportunities';

type OpportunityCardProps = {
  opportunity: Opportunity;
  detailsHref?: string;
  entryHref?: string;
  onHide?: (opportunity: Opportunity) => void;
  projectId: string;
  renderKey: string;
  className?: string;
};

const TYPE_LABELS: Record<Opportunity['type'], string> = {
  CONCENTRATION: 'Yoğunlaşma Uyarısı',
  TREND_INCREASE: 'Trend Artışı',
  ANOMALY_DETECTED: 'Anomali Tespiti',
  BEST_PRACTICE_TIP: 'En İyi Pratik',
};

const TYPE_STYLES: Record<Opportunity['type'], { border: string; badge: string; iconBg: string; iconColor: string; Icon: ComponentType<{ size?: number | string; className?: string }>; }> = {
  CONCENTRATION: {
    border: 'border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-white/0',
    badge: 'text-amber-200 bg-amber-500/10 border-amber-400/30',
    iconBg: 'bg-amber-500/15 border-amber-400/30',
    iconColor: 'text-amber-300',
    Icon: Lightbulb,
  },
  TREND_INCREASE: {
    border: 'border-sky-400/40 bg-gradient-to-br from-sky-500/10 to-white/0',
    badge: 'text-sky-200 bg-sky-500/10 border-sky-400/30',
    iconBg: 'bg-sky-500/15 border-sky-400/30',
    iconColor: 'text-sky-300',
    Icon: TrendingUp,
  },
  ANOMALY_DETECTED: {
    border: 'border-red-500/40 bg-gradient-to-br from-red-500/10 to-white/0',
    badge: 'text-red-200 bg-red-500/10 border-red-400/30',
    iconBg: 'bg-red-500/15 border-red-400/30',
    iconColor: 'text-red-300',
    Icon: AlertTriangle,
  },
  BEST_PRACTICE_TIP: {
    border: 'border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 to-white/0',
    badge: 'text-emerald-200 bg-emerald-500/10 border-emerald-400/30',
    iconBg: 'bg-emerald-500/15 border-emerald-400/30',
    iconColor: 'text-emerald-300',
    Icon: Leaf,
  },
};

type MetadataItem = { label: string; value: string };

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1, ...options }).format(numeric);
}

function formatTons(valueKg: unknown, fractionDigits = 2) {
  const numeric = typeof valueKg === 'number' ? valueKg : Number(valueKg);
  if (!Number.isFinite(numeric)) return null;
  const tons = numeric / 1000;
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: fractionDigits }).format(tons);
}

function mapMetadata(opportunity: Opportunity): MetadataItem[] {
  const meta = opportunity.metadata ?? {};
  const chunks: Array<{ label: string; value: string; priority: number }> = [];

  const push = (label: string, value: string | null, priority = 5) => {
    if (!value) return;
    chunks.push({ label, value, priority });
  };

  if ('categoryLabel' in meta || 'category' in meta) {
    push('Kategori', String(meta.categoryLabel || meta.category), 8);
  }

  if ('percentage' in meta) {
    const formatted = formatNumber(meta.percentage, { maximumFractionDigits: 0 });
    push('Pay', formatted ? `%${formatted}` : null, 1);
  }

  if ('increase_percentage' in meta) {
    const formatted = formatNumber(meta.increase_percentage, { maximumFractionDigits: 0 });
    push('Artış', formatted ? `%${formatted}` : null, 0);
  }

  if ('current_period_total_kg' in meta) {
    const formatted = formatTons(meta.current_period_total_kg);
    push('Son Dönem', formatted ? `${formatted} ton` : null, 1);
  }

  if ('previous_period_total_kg' in meta) {
    const formatted = formatTons(meta.previous_period_total_kg);
    push('Önceki Dönem', formatted ? `${formatted} ton` : null, 2);
  }

  if ('ratio' in meta) {
    const formatted = formatNumber(meta.ratio, { maximumFractionDigits: 1 });
    push('Fark (kat)', formatted ? `${formatted}x` : null, 1);
  }

  if ('total_tons' in meta) {
    const formatted = formatNumber(meta.total_tons, { maximumFractionDigits: 2 });
    push('Toplam Miktar', formatted ? `${formatted} ton` : null, 2);
  }

  if ('total_co2e_kg' in meta) {
    const formatted = formatTons(meta.total_co2e_kg);
    push('Toplam CO₂e', formatted ? `${formatted} ton` : null, 2);
  }

  if ('window_days' in meta) {
    push('Dönem', `${meta.window_days} gün`, 3);
  }

  if ('category_total_kg' in meta) {
    const formatted = formatTons(meta.category_total_kg);
    push('Kategori Toplamı', formatted ? `${formatted} ton` : null, 3);
  }

  if ('project_total_kg' in meta) {
    const formatted = formatTons(meta.project_total_kg);
    push('Proje Toplamı', formatted ? `${formatted} ton` : null, 4);
  }

  if ('value_kg' in meta) {
    const formatted = formatTons(meta.value_kg);
    push('Kayıt Değeri', formatted ? `${formatted} ton` : null, 0);
  }

  if ('mean_kg' in meta) {
    const formatted = formatTons(meta.mean_kg);
    push('Ortalama', formatted ? `${formatted} ton` : null, 3);
  }

  if ('stddev_kg' in meta) {
    const formatted = formatTons(meta.stddev_kg, 3);
    push('Std Sapma', formatted ? `${formatted} ton` : null, 4);
  }

  if ('threshold_kg' in meta) {
    const formatted = formatTons(meta.threshold_kg);
    push('Eşik', formatted ? `${formatted} ton` : null, 2);
  }

  if ('entry_id' in meta) {
    push('Kayıt ID', String(meta.entry_id), 10);
  }

  return chunks
    .sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label))
    .map(({ label, value }) => ({ label, value }));
}

export function OpportunityCard({ opportunity, detailsHref, entryHref, onHide, className, projectId, renderKey }: OpportunityCardProps) {
  const [visible, setVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const config = TYPE_STYLES[opportunity.type];
  const metadataItems = useMemo(() => mapMetadata(opportunity), [opportunity]);

  useEffect(() => {
    setVisible(true);
    setErrorMessage(null);
  }, [renderKey, opportunity.opportunityKey]);

  useEffect(() => {
    const handler = () => {
      setVisible(true);
      setErrorMessage(null);
    };
    window.addEventListener('opportunities:reset', handler);
    return () => window.removeEventListener('opportunities:reset', handler);
  }, []);

  if (!visible) return null;

  const handleHide = async () => {
    if (dismissing) return;
    setErrorMessage(null);
    setDismissing(true);
    setVisible(false);
    try {
      const response = await fetch('/api/opportunities/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          opportunityId: opportunity.opportunityKey,
          ruleId: opportunity.ruleId,
        }),
      });
      if (!response.ok) {
        throw new Error(`dismiss_failed_${response.status}`);
      }
      onHide?.(opportunity);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Fırsat gizlendi', variant: 'info' } }));
      }
    } catch (err) {
      console.error('[opportunities] dismiss failed', err);
      setVisible(true);
      setErrorMessage('Fırsat gizlenemedi, lütfen tekrar deneyin.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Fırsat gizlenemedi', variant: 'error' } }));
      }
    } finally {
      setDismissing(false);
    }
  };

  const TypeIcon = config.Icon;

  return (
    <div className={twMerge('rounded-xl border bg-white/5 backdrop-blur-sm shadow-lg transition-colors flex flex-col overflow-hidden', config.border, className)}>
      <div className="flex items-start gap-4 p-5 border-b border-white/10">
        <div className={twMerge('p-2.5 rounded-lg border', config.iconBg)}>
          <TypeIcon size={20} className={config.iconColor} />
        </div>
        <div className="flex-1 space-y-1">
          <span className={twMerge('text-xs font-semibold uppercase tracking-wide inline-flex px-2 py-0.5 rounded-full border', config.badge)}>
            {TYPE_LABELS[opportunity.type]}
          </span>
          <h3 className="text-lg font-semibold text-white">{opportunity.title}</h3>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-white/85 leading-relaxed">
          {opportunity.suggestion}
        </p>

        {metadataItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metadataItems.map((item) => (
              <div key={`${item.label}-${item.value}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60 uppercase tracking-wide">{item.label}</div>
                <div className="text-sm text-white/90 font-medium">{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 mt-auto flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:w-auto w-full">
          {detailsHref && (
            <a
              href={detailsHref}
              className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/20 hover:border-white/25 transition-all"
            >
              Projeyi Aç
            </a>
          )}
          {entryHref && (
            <a
              href={entryHref}
              className="inline-flex items-center justify-center rounded-lg border border-leaf-400/30 bg-leaf-500/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-leaf-500/30 transition-all"
            >
              Kaydı Aç
            </a>
          )}
        </div>
        <div className="sm:ml-auto flex flex-col items-start gap-2 sm:items-end">
          <Button
            variant="ghost"
            onClick={handleHide}
            disabled={dismissing}
            className="sm:ml-auto"
          >
            {dismissing && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Gizle
          </Button>
          {errorMessage && (
            <span className="text-xs text-red-300 text-left sm:text-right">
              {errorMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default OpportunityCard;
