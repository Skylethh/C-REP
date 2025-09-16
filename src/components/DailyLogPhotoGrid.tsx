"use client";
import { supabaseBrowser } from '@/lib/client';
import { useEffect, useMemo, useState } from 'react';

function fileNameFromKey(key: string) {
  const parts = key.split('/')
  return parts[parts.length - 1] || key;
}

export function DailyLogPhotoGrid({ projectId, logId, keys }: { projectId: string; logId: string; keys: string[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const sorted = useMemo(() => [...keys].sort(), [keys]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const entries: [string, string][] = [];
      for (const k of sorted) {
        const { data } = await supabaseBrowser.storage.from('project-files').createSignedUrl(k.replace(/^project-files\//,''), 60 * 10);
        if (data?.signedUrl) entries.push([k, data.signedUrl]);
      }
      if (mounted) setUrls(Object.fromEntries(entries));
    })();
    return () => { mounted = false };
  }, [sorted]);

  async function remove(key: string) {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      // Remove from daily_logs.photos
      const { data, error: selErr } = await supabaseBrowser.from('daily_logs').select('photos').eq('id', logId).maybeSingle();
      if (selErr) throw selErr;
      const current: string[] = Array.isArray(data?.photos) ? data?.photos : [];
      const next = current.filter((k) => k !== key);
      const { error: updErr } = await supabaseBrowser.from('daily_logs').update({ photos: next }).eq('id', logId);
      if (updErr) throw updErr;
      // Try delete the object (ignore if fails due to permissions)
      await supabaseBrowser.storage.from('project-files').remove([key.replace(/^project-files\//,'')]);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Silindi', variant: 'success' } }));
      // Optimistic update
      setUrls((u) => { const n = { ...u }; delete n[key]; return n; });
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message || 'Silme hatası', variant: 'error' } }));
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  if (!sorted.length) return <div className="text-white/60 text-sm">Henüz fotoğraf yok.</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {sorted.map((k) => (
        <div key={k} className="rounded border border-white/10 bg-white/5 overflow-hidden">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[k]} alt={fileNameFromKey(k)} className="w-full h-32 object-cover" />
            <button disabled={!!busy[k]} onClick={() => remove(k)} className="absolute top-1 right-1 text-xs px-2 py-1 rounded bg-red-600/80">Sil</button>
          </div>
          <div className="px-2 py-1 text-[10px] text-white/70 truncate">{fileNameFromKey(k)}</div>
        </div>
      ))}
    </div>
  );
}
