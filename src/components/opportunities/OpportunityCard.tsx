"use client";
import { Button } from '@/components/button';
import { twMerge } from 'tailwind-merge';

export type OpportunityCardProps = {
  icon?: React.ReactNode;
  title: string;
  finding: string;
  suggestion: string;
  impact: { co2eKg: number; co2eTons: number; note?: string };
  severity?: 'info' | 'warning' | 'critical';
  detailsHref?: string;
  filteredHref?: string;
  filteredLabel?: string;
  onHide?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
};

export function OpportunityCard({ icon, title, finding, suggestion, impact, severity, detailsHref, filteredHref, filteredLabel, onHide, rightAction, className }: OpportunityCardProps) {
  const impactStr = (() => {
    const tons = impact?.co2eTons || 0;
    const unit = Math.abs(tons) >= 0.999 ? 'tCO2e' : 'kg CO2e';
    const value = unit === 'tCO2e' ? tons : (impact?.co2eKg || 0);
    const formatted = Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
    return `Tahmini Azaltım: -${formatted} ${unit}`;
  })();

  const severityPill = (() => {
    if (!severity) return null;
    const label = severity === 'critical' ? 'Kritik' : severity === 'warning' ? 'Uyarı' : 'Bilgi';
    const cls = severity === 'critical'
      ? 'bg-red-500/15 text-red-300'
      : severity === 'warning'
      ? 'bg-amber-500/15 text-amber-300'
      : 'bg-blue-500/15 text-blue-300';
    return <span className={twMerge('text-xs px-2 py-0.5 rounded-full border border-white/10', cls)}>{label}</span>;
  })();

  return (
    <div className={twMerge("rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-md overflow-hidden flex flex-col", className)}>
      <div className="p-5 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent flex items-center gap-3">
        <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10 text-leaf-400">
          {icon ?? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="m2 2 20 20" />
              <path d="M8 2h8l2 7H6l2-7Z" />
            </svg>
          )}
        </div>
        <h3 className="font-semibold text-lg flex-1">{title}</h3>
        {severityPill}
      </div>

      <div className="p-5 space-y-4">
        <div>
          <div className="text-sm text-white/60 mb-1">Tespit</div>
          <div className="text-white/90">{finding}</div>
        </div>
        <div>
          <div className="text-sm text-white/60 mb-1">Öneri</div>
          <div className="text-white/90">{suggestion}</div>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 border border-leaf-500/20 p-3">
          <div className="text-sm text-white/80">{impactStr}</div>
          {impact?.note && <div className="text-xs text-white/60 mt-1">{impact.note}</div>}
        </div>
      </div>

      <div className="px-5 pb-5 mt-auto flex gap-3">
        {detailsHref && (
          <a
            href={detailsHref}
            className="bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 px-4 py-2.5 rounded-lg transition-all duration-200"
          >
            Detayları İncele
          </a>
        )}
        {filteredHref && (
          <a
            href={filteredHref}
            className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-4 py-2.5 rounded-lg transition-all duration-200"
          >
            {filteredLabel || 'Detayları Filtreli Aç'}
          </a>
        )}
        <div className="ml-auto">
          {onHide ? (
            <Button
              variant="ghost"
              onClick={() => onHide?.()}
            >
              Gizle
            </Button>
          ) : rightAction ? (
            rightAction
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default OpportunityCard;
