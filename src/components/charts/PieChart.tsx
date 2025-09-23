"use client";
import React from 'react';

export default function PieChart({ data }: { data: Array<{ label: string; value: number }>; }) {
  // Minimal inline pie for preview purposes
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  let acc = 0;
  const segments = data.map((d, i) => {
    const v = (d.value || 0);
    const frac = v / total;
    const start = acc;
    const end = acc + frac;
    acc = end;
    const large = frac > 0.5 ? 1 : 0;
    const a0 = 2 * Math.PI * start;
    const a1 = 2 * Math.PI * end;
    const r = 40;
    const cx = 50, cy = 50;
    const x0 = cx + r * Math.cos(a0); const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1); const y1 = cy + r * Math.sin(a1);
    const dPath = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
    const color = ['#16A34A','#0EA5A1','#64748B','#A78BFA','#F59E0B','#EF4444','#22C55E'][i % 7];
    return <path key={i} d={dPath} fill={color} stroke="#0b1e28" strokeWidth={0.5} />;
  });
  return (
    <svg viewBox="0 0 100 100" className="w-32 h-32">
      {segments}
    </svg>
  );
}
