"use client";
import { supabaseBrowser } from '@/lib/client';
import { useEffect, useMemo, useState } from 'react';

interface PhotoItem {
  path: string;
  original_name: string;
}

function fileNameFromKey(key: string) {
  const parts = key.split('/')
  return parts[parts.length - 1] || key;
}

export function DailyLogPhotoGrid({ projectId, logId, keys }: { projectId: string; logId: string; keys: (string | PhotoItem)[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const normalizePath = (k: string | PhotoItem): string => (typeof k === 'string' ? k : k.path);
  const displayName = (k: string | PhotoItem): string => (typeof k === 'string' ? fileNameFromKey(k) : (k.original_name || fileNameFromKey(k.path)));

  // Normalize to a list of { path, name }
  const items = useMemo(() => (
    [...keys].map((k) => ({ path: normalizePath(k), name: displayName(k) }))
  ), [keys]);

  // Sort by path for stable ordering
  const sorted = useMemo(() => (
    [...items].sort((a, b) => a.path.localeCompare(b.path))
  ), [items]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const entries: [string, string][] = [];
      for (const it of sorted) {
        const { data } = await supabaseBrowser.storage
          .from('project-files')
          .createSignedUrl(it.path.replace(/^project-files\//, ''), 60 * 10);
        if (data?.signedUrl) entries.push([it.path, data.signedUrl]);
      }
      if (mounted) setUrls(Object.fromEntries(entries));
    })();
    return () => { mounted = false };
  }, [sorted]);

  async function remove(path: string) {
    setBusy((b) => ({ ...b, [path]: true }));
    try {
      // Remove from daily_logs.photos
      const { data, error: selErr } = await supabaseBrowser.from('daily_logs').select('photos').eq('id', logId).maybeSingle();
      if (selErr) throw selErr;
      const current: any[] = Array.isArray(data?.photos) ? data?.photos : [];
      const next = current.filter((p: any) => (typeof p === 'string' ? p !== path : p?.path !== path));
      const { error: updErr } = await supabaseBrowser.from('daily_logs').update({ photos: next }).eq('id', logId);
      if (updErr) throw updErr;
      // Try delete the object (ignore if fails due to permissions)
      await supabaseBrowser.storage.from('project-files').remove([path.replace(/^project-files\//, '')]);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Silindi', variant: 'success' } }));
      // Optimistic update
      setUrls((u) => { const n = { ...u }; delete n[path]; return n; });
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message || 'Silme hatası', variant: 'error' } }));
    } finally {
      setBusy((b) => ({ ...b, [path]: false }));
    }
  }

  if (!sorted.length) return <div className="text-white/60 text-sm">Henüz fotoğraf yok.</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {sorted.map(({ path, name }) => {
        return (
          <div key={path} className="rounded border border-white/10 bg-white/5 overflow-hidden">
            <div className="relative">
              { }
              <img src={urls[path]} alt={name} className="w-full h-32 object-cover" />
              <button disabled={!!busy[path]} onClick={() => remove(path)} className="absolute top-1 right-1 text-xs px-2 py-1 rounded bg-red-600/80">Sil</button>
            </div>
            <div className="px-2 py-1 text-[10px] text-white/70 truncate">{name}</div>
          </div>
        );
      })}
    </div>
  );
}
