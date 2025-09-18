"use client";
import { useState } from 'react';

export type EquipmentRow = {
  id: string;
  log_id: string;
  equipment_name: string;
  hours: number;
  created_at: string;
};

export function DailyLogEquipmentSection({ logId, initial }: { logId: string; initial: EquipmentRow[] }) {
  const [rows, setRows] = useState<EquipmentRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ equipment_name: '', hours: '' });

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const payload = {
        log_id: logId,
        equipment_name: form.equipment_name,
        hours: Number(form.hours || 0),
      } as const;
      const res = await fetch(`/api/daily-logs/${logId}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Ekleme hatası');
      setRows((r) => [json.data as EquipmentRow, ...r]);
      setForm({ equipment_name: '', hours: '' });
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
    const res = await fetch(`/api/daily-logs/${logId}/equipment?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: json?.error || 'Silme hatası', variant: 'error' } }));
    }
  }

  return (
    <details className="glass rounded-lg border border-white/20 p-4 group hover:border-orange-400/40 transition-all duration-200">
      <summary className="cursor-pointer font-medium mb-2 flex items-center gap-2 hover:text-leaf-300 transition-all duration-200 list-none">
        <div className="flex items-center gap-2 flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Sahadaki Ekipmanlar
          <span className="text-xs text-white/50">({rows.length} kayıt)</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60 transition-transform duration-200 group-open:rotate-180">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </summary>
      <div className="space-y-2 mb-4">
        {rows.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-sm">{e.equipment_name} • {e.hours} saat</div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/60">{new Date(e.created_at).toLocaleTimeString()}</div>
              <button onClick={() => onDelete(e.id)} className="text-red-300 hover:text-red-200 text-xs border border-red-400/30 rounded px-2 py-0.5">Sil</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-white/60 text-sm">Henüz ekipman eklenmedi.</div>}
      </div>
      <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          name="equipment_name"
          placeholder="Ekipman Adı"
          className="form-input"
          value={form.equipment_name}
          onChange={(e) => setForm((f) => ({ ...f, equipment_name: e.target.value }))}
          required
        />
        <input
          type="number"
          min={0}
          step="0.1"
          name="hours"
          placeholder="Çalışma Saati"
          className="form-input"
          value={form.hours}
          onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
          required
        />
        <button type="submit" className="btn-primary" disabled={busy}>+ Ekle</button>
      </form>
    </details>
  );
}
