"use client";
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/client';

export type ManpowerRow = {
  id: string;
  log_id: string;
  contractor: string | null;
  trade: string | null;
  person_count: number;
  created_at: string;
};

export function DailyLogManpowerSection({ logId, initial }: { logId: string; initial: ManpowerRow[] }) {
  const [rows, setRows] = useState<ManpowerRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ contractor: '', trade: '', person_count: '' });

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const payload = {
        log_id: logId,
        contractor: form.contractor || null,
        trade: form.trade || null,
        person_count: Number(form.person_count || 0),
      } as const;
      const res = await fetch(`/api/daily-logs/${logId}/manpower`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Ekleme hatası');
      setRows((r) => [json.data as ManpowerRow, ...r]);
      setForm({ contractor: '', trade: '', person_count: '' });
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Eklendi', variant: 'success' } }));
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message || 'Ekleme hatası', variant: 'error' } }));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    setRows((r) => r.filter((x) => x.id !== id)); // optimistic
    const res = await fetch(`/api/daily-logs/${logId}/manpower?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: json?.error || 'Silme hatası', variant: 'error' } }));
    }
  }

  return (
    <details className="glass rounded-lg border border-white/20 p-4 group hover:border-purple-400/40 transition-all duration-200">
      <summary className="cursor-pointer font-medium mb-2 flex items-center gap-2 hover:text-leaf-300 transition-all duration-200 list-none">
        <div className="flex items-center gap-2 flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          İş Gücü
          <span className="text-xs text-white/50">({rows.length} kayıt)</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60 transition-transform duration-200 group-open:rotate-180">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </summary>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">İş Gücü</div>
      </div>
      <div className="space-y-2 mb-4">
        {rows.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-sm">{m.contractor || 'Taşeron'} • {m.trade || 'Meslek'} • {m.person_count} kişi</div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/60">{new Date(m.created_at).toLocaleTimeString()}</div>
              <button onClick={() => onDelete(m.id)} className="text-red-300 hover:text-red-200 text-xs border border-red-400/30 rounded px-2 py-0.5">Sil</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-white/60 text-sm">Henüz iş gücü eklenmedi.</div>}
      </div>
      <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="text"
          name="contractor"
          placeholder="Taşeron Firma"
          className="form-input"
          value={form.contractor}
          onChange={(e) => setForm((f) => ({ ...f, contractor: e.target.value }))}
        />
        <input
          type="text"
          name="trade"
          placeholder="Meslek (Kalıpçı, Demirci)"
          className="form-input"
          value={form.trade}
          onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))}
        />
        <input
          type="number"
          min={0}
          name="person_count"
          placeholder="Kişi Sayısı"
          className="form-input"
          value={form.person_count}
          onChange={(e) => setForm((f) => ({ ...f, person_count: e.target.value }))}
          required
        />
        <button type="submit" className="btn-primary" disabled={busy}>+ Ekle</button>
      </form>
    </details>
  );
}
