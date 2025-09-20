"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  from?: string; // yyyy-mm-dd
  to?: string;   // yyyy-mm-dd
  onChange: (from: string, to: string) => void;
  className?: string;
  label?: string;
};

export default function DateRangePicker({ from, to, onChange, className = "", label = "Tarih Aralığı" }: Props) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<string>(from || "");
  const [draftTo, setDraftTo] = useState<string>(to || "");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setDraftFrom(from || ""); }, [from]);
  useEffect(() => { setDraftTo(to || ""); }, [to]);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open]);

  const labelText = useMemo(() => {
    if (!from && !to) return "Tarih seçin";
    const fmt = (s?: string) => {
      if (!s) return "";
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return s;
      return d.toLocaleDateString("tr-TR");
    };
    return `${fmt(from)} – ${fmt(to)}`.trim();
  }, [from, to]);

  const apply = () => {
    if (!draftFrom || !draftTo) {
      onChange(draftFrom || "", draftTo || "");
      setOpen(false);
      return;
    }
    // ensure draftFrom <= draftTo
    const df = new Date(draftFrom);
    const dt = new Date(draftTo);
    if (df > dt) {
      // swap
      onChange(draftTo, draftFrom);
    } else {
      onChange(draftFrom, draftTo);
    }
    setOpen(false);
  };

  const clear = () => {
    setDraftFrom("");
    setDraftTo("");
    onChange("", "");
    setOpen(false);
  };

  // Quick presets
  const todayIso = () => new Date().toISOString().slice(0,10);
  const toIso = (d: Date) => d.toISOString().slice(0,10);
  const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const lastMonthRange = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const end = new Date(d.getFullYear(), d.getMonth(), 0);
    return { from: toIso(start), to: toIso(end) };
  };
  const thisYearRange = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    const end = new Date(d.getFullYear(), 11, 31);
    return { from: toIso(start), to: toIso(end) };
  };
  const last7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return { from: toIso(start), to: toIso(end) };
  };
  const setPreset = (range: { from: string; to: string }, applyNow = true) => {
    setDraftFrom(range.from);
    setDraftTo(range.to);
    if (applyNow) {
      onChange(range.from, range.to);
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="grid gap-2">
        {label && <label className="text-sm text-white/80">{label}</label>}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between w-full bg-transparent border border-white/20 rounded-md px-3 py-2 text-left hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-leaf-500/60 transition"
        >
          <span className="truncate text-white/90 text-sm">{labelText}</span>
          <svg className="w-4 h-4 text-white/60 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {open && (
        <div ref={panelRef} className="absolute z-50 mt-2 w-[min(420px,90vw)] bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-xl p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <button type="button" className="text-xs px-2 py-1 rounded-md border border-white/15 text-white/80 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-leaf-500/60" onClick={() => setPreset(last7Days())}>Son 7 gün</button>
            <button type="button" className="text-xs px-2 py-1 rounded-md border border-white/15 text-white/80 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-leaf-500/60" onClick={() => setPreset({ from: toIso(startOfMonth()), to: toIso(endOfMonth()) })}>Bu ay</button>
            <button type="button" className="text-xs px-2 py-1 rounded-md border border-white/15 text-white/80 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-leaf-500/60" onClick={() => setPreset(lastMonthRange())}>Geçen ay</button>
            <button type="button" className="text-xs px-2 py-1 rounded-md border border-white/15 text-white/80 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-leaf-500/60" onClick={() => setPreset(thisYearRange())}>Bu yıl</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-xs text-white/60">Başlangıç</label>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="bg-transparent border border-white/20 rounded-md px-3 py-2 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-leaf-500/60"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs text-white/60">Bitiş</label>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="bg-transparent border border-white/20 rounded-md px-3 py-2 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-leaf-500/60"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button type="button" onClick={clear} className="text-xs text-white/60 hover:text-white/80 underline underline-offset-4">Temizle</button>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm rounded-md border border-white/15 text-white/80 hover:bg-white/5">Vazgeç</button>
              <button type="button" onClick={apply} className="px-3 py-2 text-sm rounded-md bg-leaf-500/90 hover:bg-leaf-500 text-black font-medium">Uygula</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
