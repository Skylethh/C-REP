"use client";

import { useMemo } from 'react';
import { formatCo2eTons } from '@/lib/units';

interface BeforeAfterProps {
  beforeKg: number;
  afterKg: number;
  height?: number;
  labels?: { before: string; after: string };
}

export default function BeforeAfter({ beforeKg, afterKg, height = 160, labels = { before: 'Mevcut', after: 'Öneri' } }: BeforeAfterProps) {
  const before = useMemo(() => formatCo2eTons(beforeKg, 2), [beforeKg]);
  const after = useMemo(() => formatCo2eTons(afterKg, 2), [afterKg]);
  const reduction = useMemo(() => {
    const diffKg = Math.max(0, beforeKg - afterKg);
    const pct = beforeKg > 0 ? (diffKg / beforeKg) * 100 : 0;
    return { diff: formatCo2eTons(diffKg, 2), pct: pct.toFixed(1) };
  }, [beforeKg, afterKg]);

  // Simple flex bars, no canvas needed here
  const maxKg = Math.max(beforeKg, afterKg, 1);
  const beforePct = Math.round((beforeKg / maxKg) * 100);
  const afterPct = Math.round((afterKg / maxKg) * 100);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-white/60 mb-1">{labels.before}</div>
          <div className="bg-white/10 rounded-md h-8 relative overflow-hidden">
            <div className="bg-emerald-500/80 h-full" style={{ width: `${beforePct}%` }} />
          </div>
          <div className="text-xs mt-1">{before.value} {before.unit}</div>
        </div>
        <div>
          <div className="text-xs text-white/60 mb-1">{labels.after}</div>
          <div className="bg-white/10 rounded-md h-8 relative overflow-hidden">
            <div className="bg-sky-500/80 h-full" style={{ width: `${afterPct}%` }} />
          </div>
          <div className="text-xs mt-1">{after.value} {after.unit}</div>
        </div>
      </div>
      <div className="text-sm text-white/80">
        Potansiyel azalma: <span className="font-medium text-emerald-300">{reduction.diff.value} {reduction.diff.unit}</span> ({reduction.pct}%)
      </div>
    </div>
  );
}
