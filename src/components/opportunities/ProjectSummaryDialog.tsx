"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, RefreshCcw, Sparkles, X } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { getProjectAISummary, type ProjectAISummaryResult } from "@/app/actions/opportunities";

export type ProjectSummaryDialogProps = {
  projectId: string;
  projectName: string;
  aiEnabled: boolean;
};

export function ProjectSummaryDialog({ projectId, projectName, aiEnabled }: ProjectSummaryDialogProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ProjectAISummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasSummary = result?.success ?? false;

  const handleFetch = useCallback(() => {
    if (!aiEnabled) return;
    setError(null);
    startTransition(async () => {
      const response = await getProjectAISummary(projectId);
      if (response.success) {
        setResult(response);
      } else {
        setResult(null);
        setError(response.error);
      }
    });
  }, [aiEnabled, projectId]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (next && !hasSummary && !isPending) {
      handleFetch();
    }
    if (!next && !isPending) {
      setError(null);
    }
  }, [handleFetch, hasSummary, isPending]);

  const stats = result?.success ? result.stats : null;

  const scopeItems = useMemo(() => {
    if (!stats) return [];
    return stats.scopeBreakdown.map((item) => ({
      scope: formatScope(item.scope),
      percentage: item.percentage,
      total: item.totalKg,
    }));
  }, [stats]);

  const categoryItems = useMemo(() => {
    if (!stats) return [];
    return stats.topCategories.map((item) => ({
      category: item.category,
      percentage: item.percentage,
      total: item.totalKg,
    }));
  }, [stats]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={twMerge(
            "group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all",
            "bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 hover:from-violet-500 hover:to-fuchsia-500",
            "border border-violet-400/30 hover:border-violet-400/50",
            "shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40",
            "text-white",
            !aiEnabled && "opacity-50 cursor-not-allowed hover:from-violet-600/90 hover:to-fuchsia-600/90"
          )}
          disabled={!aiEnabled}
        >
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-400/0 via-white/10 to-fuchsia-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Sparkles className="relative h-4 w-4 group-hover:animate-pulse" aria-hidden />
          <span className="relative">AI ile Proje Analizi</span>
          <span className="relative inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-white/20 border border-white/30">
            AI
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[130] flex w-full max-h-[88vh] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950/95 to-indigo-950/95 shadow-glow-lg">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/5 px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-semibold text-white">{projectName} – Genel Analiz</Dialog.Title>
              <Dialog.Description className="text-sm text-white/70">
                Toplanan emisyon kayıtlarına dayalı hızlı özet.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-white/10 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            {!aiEnabled && (
              <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                AI özelliği bu ortamda devre dışı bırakıldığı için özet üretilemiyor.
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {isPending && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-5 text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>AI özeti hazırlanıyor…</span>
              </div>
            )}

            {stats && !isPending && result?.success && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard label="Toplam Emisyon" value={formatTons(stats.totalKg)} />
                  <StatCard label="Kayıt Sayısı" value={new Intl.NumberFormat("tr-TR").format(stats.entryCount)} />
                  <StatCard
                    label="Son 30 Günlük Trend"
                    value={`${formatTons(stats.trend.currentKg)} / ${formatDeltaPercent(stats.trend.changePercent)}`}
                    helper={stats.trend.previousKg > 0 ? `Önceki dönem: ${formatTons(stats.trend.previousKg)}` : undefined}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <BreakdownCard
                    title="Scope Dağılımı"
                    emptyText="Scope bilgisi bulunamadı."
                    items={scopeItems.map((item) => ({
                      title: item.scope,
                      subtitle: formatTons(item.total),
                      percentage: item.percentage,
                    }))}
                  />
                  <BreakdownCard
                    title="En Yoğun Kategoriler"
                    emptyText="Kategori bazlı bilgi bulunamadı."
                    items={categoryItems.map((item) => ({
                      title: item.category,
                      subtitle: formatTons(item.total),
                      percentage: item.percentage,
                    }))}
                  />
                </div>

                {stats.truncated && (
                  <div className="text-xs text-white/60">
                    Not: Özet, ilk 3000 kayıt üzerinden oluşturuldu.
                  </div>
                )}

                <div className="rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 px-5 py-4">
                  <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-100">
                    <Sparkles className="h-4 w-4 text-violet-300" aria-hidden />
                    AI Özü
                  </div>
                  <div className="space-y-4 whitespace-pre-line text-sm leading-relaxed text-white/85">
                    {result.summary}
                  </div>
                  <div className="mt-4 text-xs text-white/50">
                    Oluşturulma zamanı: {new Date(result.generatedAt).toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-6 py-4">
            <div className="text-xs text-white/50">
              {stats ? `${scopeItems.length} scope, ${categoryItems.length} kategori analiz edildi.` : 'AI özetini başlatmak için butona tıklayın.'}
            </div>
            <div className="flex items-center gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Kapat
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleFetch}
                disabled={isPending || !aiEnabled}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-violet-400/40 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 text-violet-50 transition-all hover:border-violet-400/60 hover:from-violet-500/35 hover:to-fuchsia-500/35 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCcw className="h-4 w-4" aria-hidden />}
                Yeniden Analiz Et
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StatCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
      {helper && <div className="mt-1 text-xs text-white/50">{helper}</div>}
    </div>
  );
}

function BreakdownCard({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{ title: string; subtitle: string; percentage: number }>;
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      {items.length === 0 ? (
        <div className="mt-3 text-sm text-white/60">{emptyText}</div>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-white/80">
          {items.map((item) => (
            <li key={item.title} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-white">{item.title}</div>
                <div className="text-xs text-white/50">{item.subtitle}</div>
              </div>
              <span className="text-xs font-semibold text-white/70">{formatPercentage(item.percentage)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatTons(value: number): string {
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value / 1000)} ton CO₂e`;
}

function formatPercentage(value: number): string {
  return `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value)}`;
}

function formatDeltaPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'veri yok';
  const formatted = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value);
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatted}%`;
}

function formatScope(value: string): string {
  const key = value?.toLowerCase?.() ?? '';
  if (key === 'scope1') return 'Scope 1';
  if (key === 'scope2') return 'Scope 2';
  if (key === 'scope3') return 'Scope 3';
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Bilinmeyen';
}
