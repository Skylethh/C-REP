"use client";
import { useMemo, useState } from 'react';

export type Activity = { id: string; name: string; default_unit: string; units: string[] | null };
export type MaterialRow = {
  id: string;
  log_id: string;
  activity_id: string;
  quantity: number;
  unit: string;
  created_at: string;
  activities?: { name: string; default_unit: string; units: string[] | null } | null;
};

export function DailyLogMaterialsSection({ logId, activities, initial }: { logId: string; activities: Activity[]; initial: MaterialRow[] }) {
  const [rows, setRows] = useState<MaterialRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ activity_id: '', quantity: '', unit: '' });

  const selected = useMemo(() => activities.find((a) => a.id === form.activity_id), [activities, form.activity_id]);
  const unitOptions = useMemo(() => {
    if (!selected) return [] as string[];
    const units = Array.isArray(selected.units) ? selected.units : [];
    return Array.from(new Set([selected.default_unit, ...units].filter(Boolean)));
  }, [selected]);

  function onActivityChange(id: string) {
    const nextUnit = activities.find((a) => a.id === id)?.default_unit || '';
    setForm((f) => ({ ...f, activity_id: id, unit: nextUnit }));
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (!selected) throw new Error('Aktivite seçin');
      if (!unitOptions.includes(form.unit)) throw new Error('Seçilen birim geçerli değil');
        const res = await fetch(`/api/daily-logs/${logId}/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_id: form.activity_id,
            quantity: Number(form.quantity || 0),
            unit: form.unit,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Ekleme hatası');
        setRows((r) => [json.data as MaterialRow, ...r]);
      setForm({ activity_id: '', quantity: '', unit: '' });
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Eklendi', variant: 'success' } }));
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message || 'Ekleme hatası', variant: 'error' } }));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    setRows((r) => r.filter((x) => x.id !== id));
      const res = await fetch(`/api/daily-logs/${logId}/materials?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: json?.error || 'Silme hatası', variant: 'error' } }));
      }
  }

  return (
    <details className="glass rounded-lg border border-white/20 p-4 group hover:border-emerald-400/40 transition-all duration-200">
      <summary className="cursor-pointer font-medium mb-2 flex items-center gap-2 hover:text-leaf-300 transition-all duration-200 list-none">
        <div className="flex items-center gap-2 flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          Gelen Malzemeler
          <span className="text-xs text-white/50">({rows.length} kayıt)</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60 transition-transform duration-200 group-open:rotate-180">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </summary>
      <div className="space-y-2 mb-4">
        {rows.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-sm">{m.activities?.name || 'Malzeme'} • {m.quantity} {m.unit}</div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/60">{new Date(m.created_at).toLocaleTimeString()}</div>
              <button onClick={() => onDelete(m.id)} className="text-red-300 hover:text-red-200 text-xs border border-red-400/30 rounded px-2 py-0.5">Sil</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-white/60 text-sm">Henüz malzeme eklenmedi.</div>}
      </div>
      <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <select
          name="activity_id"
          className="form-input"
          value={form.activity_id}
          onChange={(e) => onActivityChange(e.target.value)}
          required
        >
          <option value="">— Malzeme Seç —</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          step="0.01"
          name="quantity"
          placeholder="Miktar"
          className="form-input"
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          required
        />
        <select
          name="unit"
          className="form-input"
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          required
          disabled={!selected}
        >
          {!selected && <option value="">— Birim —</option>}
          {selected && unitOptions.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <div className="md:col-span-2 flex items-center">
          <button type="submit" className="btn-primary" disabled={busy || !selected || !form.unit}>+ Ekle</button>
        </div>
      </form>
    </details>
  );
}
