"use client";

import { useEffect, useRef } from 'react';
import { formatCo2eTons } from '@/lib/units';

export interface LinePoint { label: string; value: number }

interface LineChartProps {
  data: LinePoint[];
  height?: number;
}

// Lightweight, crisp line chart for monthly totals (expects <= 24 points)
export default function LineChart({ data, height = 220 }: LineChartProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, (globalThis as any).devicePixelRatio || 1);

    const draw = () => {
      // CSS size: width from layout, height from prop
      const cssWidth = Math.max(0, Math.floor(canvas.clientWidth || 0));
      const cssHeight = height;

      // Backing store size for crispness
      const targetW = Math.max(1, Math.floor(cssWidth * dpr));
      const targetH = Math.max(1, Math.floor(cssHeight * dpr));
      if (canvas.width !== targetW) canvas.width = targetW;
      if (canvas.height !== targetH) canvas.height = targetH;
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';

      // Reset transform and scale by DPR
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const width = cssWidth;
      const h = cssHeight;

      // Clear
      ctx.clearRect(0, 0, width, h);

      // Style presets
      const axisColor = 'rgba(255,255,255,0.18)';
      const gridColor = 'rgba(255,255,255,0.10)';
      const textColor = 'rgba(255,255,255,0.75)';
      const subText = 'rgba(255,255,255,0.6)';
      const lineColor = 'rgba(56,189,248,0.95)'; // sky-400
      const fillTop = 'rgba(56,189,248,0.28)';
      const fillBottom = 'rgba(56,189,248,0.00)';

      if (!data || data.length === 0) {
        ctx.fillStyle = subText;
        ctx.font = '12px Inter, ui-sans-serif, system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Veri yok', width / 2, h / 2);
        return;
      }

      const padding = { top: 16, right: 18, bottom: 44, left: 58 };
      const plotW = Math.max(1, width - padding.left - padding.right);
      const plotH = Math.max(1, h - padding.top - padding.bottom);

      const values = data.map(d => d.value);
      const maxV = Math.max(1, Math.max(...values));

      // y-axis grid lines and labels (5 ticks)
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.font = '12px Inter, ui-sans-serif, system-ui';
      ctx.fillStyle = subText;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const ticks = 4;
      for (let i = 0; i <= ticks; i++) {
        const ratio = i / ticks;
        const rawY = padding.top + plotH - ratio * plotH;
        const y = Math.round(rawY) + 0.5; // crisp line
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        const v = maxV * ratio;
        const t = formatCo2eTons(v, 2);
        ctx.fillText(`${t.value}`, padding.left - 8, rawY);
      }

      // x-axis labels (sample to avoid overlap)
      const n = data.length;
      const stepX = plotW / Math.max(1, n - 1);
      const minLabelSpacing = 64; // px
      const maxLabels = Math.max(2, Math.floor(plotW / minLabelSpacing));
      const labelStep = Math.max(1, Math.ceil(n / maxLabels));

      ctx.fillStyle = textColor;
      ctx.font = '12px Inter, ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (let i = 0; i < n; i += 1) {
        if (i % labelStep !== 0 && i !== n - 1) continue; // show sampled + last
        const x = padding.left + i * stepX;
        const label = data[i].label; // e.g. '2025-01'
        ctx.fillText(label, x, h - 10);
      }

      // Area fill under line
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
      grad.addColorStop(0, fillTop);
      grad.addColorStop(1, fillBottom);

      // Line path
      ctx.lineWidth = 2.25;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = padding.left + i * stepX;
        const y = padding.top + plotH - (values[i] / maxV) * plotH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      // Stroke
      ctx.strokeStyle = lineColor;
      ctx.stroke();

      // Fill
      ctx.lineTo(padding.left + (n - 1) * stepX, padding.top + plotH);
      ctx.lineTo(padding.left, padding.top + plotH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Points
      for (let i = 0; i < n; i++) {
        const x = padding.left + i * stepX;
        const y = padding.top + plotH - (values[i] / maxV) * plotH;
        ctx.beginPath();
        ctx.arc(x, y, 3.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16,185,129,0.95)'; // emerald-500
        ctx.fill();
        ctx.strokeStyle = '#0b1220'; // subtle dark outline to increase contrast
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    // Initial draw
    draw();

    // Redraw on resize for crispness/responsiveness
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [data, height]);

  return (
    <div className="w-full">
      <canvas
        ref={ref}
        className="w-full max-w-full block"
        style={{ height }}
      />
      <div className="mt-1 text-xs text-white/60">Y ekseni: tCO2e</div>
    </div>
  );
}
