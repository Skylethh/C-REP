"use client";

import { useEffect, useRef, useState } from 'react';
import { formatCo2eTons } from '@/lib/units';

export interface BarDatum { label: string; value: number }

interface BarChartProps {
  data: BarDatum[];
  height?: number; // CSS pixel height of the chart area
}

// Helper to draw rounded rectangles on canvas
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  let low = 0, high = text.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid) + ellipsis;
    if (ctx.measureText(candidate).width <= maxWidth) low = mid + 1; else high = mid;
  }
  const finalText = text.slice(0, Math.max(1, low - 1)) + ellipsis;
  return finalText;
}

function labelPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  opts?: { px?: number; py?: number; bg?: string; color?: string; radius?: number; font?: string }
) {
  const px = opts?.px ?? 6;
  const py = opts?.py ?? 3;
  const bg = opts?.bg ?? 'rgba(0,0,0,0.55)';
  const color = opts?.color ?? '#fff';
  const radius = opts?.radius ?? 6;
  const prevFont = ctx.font;
  if (opts?.font) ctx.font = opts.font;
  const w = ctx.measureText(text).width + px * 2;
  const h = (parseInt((ctx.font.match(/(\d+)px/)?.[1] || '12'), 10) || 12) + py * 2;
  const x = cx - w / 2;
  const y = cy - h / 2;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 1);
  ctx.font = prevFont;
}

export default function BarChart({ data, height = 240 }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle DPR scaling for crisp rendering
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const cssWidth = wrapper.clientWidth || 560;
    const cssHeight = height;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = cssWidth;
    const h = cssHeight;
    ctx.clearRect(0, 0, width, h);

  const padding = { top: 16, right: 24, bottom: 88, left: 72 };
    const plotW = Math.max(0, width - padding.left - padding.right);
    const plotH = Math.max(0, h - padding.top - padding.bottom);

    const n = data.length;
    if (!n) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '12px Inter, ui-sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Veri yok', width / 2, h / 2);
      return;
    }

    const maxV = Math.max(1, Math.max(...data.map(d => d.value)));
    // Dynamic sizing: fill available width with adaptive gap ratio
    const minBar = 10, maxBar = 60, minGap = 2, prefRatio = 0.6;
    let barW: number; let gap: number;
    if (n <= 1) {
      barW = Math.min(maxBar, Math.max(minBar, plotW * 0.4));
      gap = 0;
    } else {
      let barW0 = plotW / (n + (n - 1) * prefRatio);
      let gap0 = prefRatio * barW0;
      if (barW0 > maxBar) {
        gap = (plotW - n * maxBar) / (n - 1);
        if (gap < minGap) {
          gap = minGap;
          barW = (plotW - (n - 1) * gap) / n;
        } else {
          barW = maxBar;
        }
      } else if (barW0 < minBar) {
        barW = Math.max(minBar, (plotW - (n - 1) * minGap) / n);
        gap = Math.max(minGap, (plotW - n * barW) / (n - 1));
      } else {
        barW = barW0;
        gap = gap0;
      }
      if (!isFinite(barW) || barW <= 0) barW = 12;
      if (!isFinite(gap) || gap < minGap) gap = minGap;
    }

    // Decide label rotation based on bar width
    let labelAngleDeg = 0;
    let labelFont = '13px Inter, ui-sans-serif';
    if (barW < 14) { labelAngleDeg = 60; labelFont = '11px Inter, ui-sans-serif'; }
    else if (barW < 24) { labelAngleDeg = 35; labelFont = '12px Inter, ui-sans-serif'; }

    // Precompute bar rects for interaction
    const rects: Array<{ x: number; y: number; w: number; h: number; label: string; value: number }> = [];

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const y = padding.top + plotH - (i / ticks) * plotH + 0.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      const v = maxV * (i / ticks);
      const t = formatCo2eTons(v, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '12px Inter, ui-sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${t.value}`, padding.left - 8, y + 3);
    }
    // Baseline
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.moveTo(padding.left, padding.top + plotH + 0.5);
    ctx.lineTo(width - padding.right, padding.top + plotH + 0.5);
    ctx.stroke();

    rects.length = 0;
    data.forEach((d, i) => {
      const x = padding.left + i * (barW + gap);
      const bh = Math.max(2, (d.value / maxV) * plotH);
      const y = padding.top + plotH - bh;

      // Gradient fill (ocean -> leaf)
      const grad = ctx.createLinearGradient(0, y, 0, y + bh);
      grad.addColorStop(0, 'rgba(56,189,248,0.95)');   // ocean-400
      grad.addColorStop(1, 'rgba(52,211,153,0.95)');   // leaf/emerald-400

      const radius = Math.min(10, barW / 2);
      roundRect(ctx, x, y, barW, bh, radius);
      ctx.fillStyle = grad;
      ctx.fill();

      // Subtle border for definition
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      ctx.stroke();

      rects.push({ x, y, w: barW, h: bh, label: d.label, value: d.value });

      // Value label (pill)
      const val = formatCo2eTons(d.value, 2);
      const labelText = `${val.value}`;
      const topRoom = y > padding.top + 18;
      ctx.font = '13px Inter, ui-sans-serif';
      if (topRoom) {
        labelPill(ctx, labelText, x + barW / 2, y - 12, { bg: 'rgba(0,0,0,0.55)', color: '#fff', radius: 8 });
      } else {
        // put inside near top
        labelPill(ctx, labelText, x + barW / 2, y + 16, { bg: 'rgba(0,0,0,0.50)', color: '#fff', radius: 8 });
      }

      // X label close to bar baseline
      const baseY = padding.top + plotH + 14;
      ctx.save();
      ctx.translate(x + barW / 2, baseY);
      ctx.rotate((-labelAngleDeg * Math.PI) / 180);
      ctx.fillStyle = 'rgba(255,255,255,0.90)';
      ctx.font = labelFont;
      ctx.textAlign = labelAngleDeg === 0 ? 'center' : 'left';
      const maxWidth = Math.min(200, barW + gap * 0.8 + 100);
      const label = truncateText(ctx, d.label, maxWidth);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });

    // Pointer interactions
    const onMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      let found: number | null = null;
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { found = i; break; }
      }
      if (found === null) {
        if (hover) setHover(null);
      } else {
        setHover({ i: found, x: mx, y: my });
      }
    };
    const onLeave = () => setHover(null);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [data, height]);

  return (
    <div ref={wrapperRef} className="w-full relative">
      <canvas ref={canvasRef} className="w-full block" />
      {hover && data[hover.i] && (
        <div
          className="pointer-events-none absolute z-10 px-2 py-1 rounded-md text-xs bg-black/80 text-white shadow-lg border border-white/10"
          style={{ left: Math.max(8, hover.x + 10), top: Math.max(8, hover.y + 10) }}
        >
          <div className="font-medium">{data[hover.i].label}</div>
          <div className="text-white/80">{formatCo2eTons(data[hover.i].value, 2).value} tCO2e</div>
        </div>
      )}
      <div className="mt-1 text-xs text-white/60">Y ekseni: tCO2e</div>
    </div>
  );
}
