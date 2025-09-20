"use client";
import { useEffect, useState } from 'react';

export type Activity = { id: string; name: string; default_unit: string; units: string[] | null };
export type MaterialRow = {
  id: string;
  log_id: string;
  activity_id: string;
  quantity: number;
  unit: string;
  created_at: string;
  entry_id?: string | null;
  activities?: { name: string; default_unit: string; units: string[] | null } | null;
};

export function DailyLogMaterialsSection({ logId, initial }: { logId: string; initial: MaterialRow[] }) {
  const [rows, setRows] = useState<MaterialRow[]>(initial);

  useEffect(() => {
    function onAdded(e: Event) {
      const anyEvt = e as CustomEvent<Partial<MaterialRow>>;
      const row = anyEvt?.detail as Partial<MaterialRow> | undefined;
      if (!row || (row as any).log_id !== logId) return;
      setRows((r) => [
        {
          id: String(row.id || crypto.randomUUID()),
          log_id: logId,
          activity_id: String(row.activity_id || ''),
          quantity: Number((row as any).quantity || 0),
          unit: String((row as any).unit || ''),
          created_at: String(row.created_at || new Date().toISOString()),
          entry_id: (row as any).entry_id ?? null,
          activities: (row as any).activities || null,
        },
        ...r,
      ]);
    }
    window.addEventListener('daily-log-material-added', onAdded as any);
    return () => window.removeEventListener('daily-log-material-added', onAdded as any);
  }, [logId]);

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
    <div className="glass rounded-lg border border-white/20 p-4 hover:border-emerald-400/40 transition-all duration-200">
      <div className="font-medium mb-3 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          Gelen Malzeme/Aktivite
          <span className="text-xs text-white/50">({rows.length} kayıt)</span>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-sm">{m.activities?.name || 'Malzeme'} • {m.quantity} {m.unit}</div>
            <div className="flex items-center gap-3">
              {m.entry_id && (
                <a href={`/entries/${m.entry_id}`} className="text-xs text-indigo-300 hover:text-indigo-200 border border-indigo-400/30 rounded px-2 py-0.5">
                  Kayda git
                </a>
              )}
              <div className="text-xs text-white/60">{new Date(m.created_at).toLocaleTimeString()}</div>
              <button onClick={() => onDelete(m.id)} className="text-red-300 hover:text-red-200 text-xs border border-red-400/30 rounded px-2 py-0.5">Sil</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-white/70 text-sm flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded px-3 py-2">
            <div>Henüz malzeme eklenmedi.</div>
            <div className="flex items-center gap-1 text-white/50">
              <span className="hidden sm:inline">Aşağıdan ekleyin</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
