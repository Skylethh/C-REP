"use client";
import { supabaseBrowser } from '@/lib/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = { key: string; url: string | null };

export function RfiPhotoGrid({ keys, projectId, rfiId }: { keys: string[]; projectId: string; rfiId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Item[] = [];
      for (const k of keys) {
        // sign if image; fallback to null
        try {
          const { data, error } = await supabaseBrowser.storage.from('project-files').createSignedUrl(k.replace(/^project-files\//, ''), 60);
          out.push({ key: k, url: error ? null : data?.signedUrl || null });
        } catch {
          out.push({ key: k, url: null });
        }
      }
      if (alive) setItems(out);
    })();
    return () => { alive = false; };
  }, [keys.join('|')]);

  async function handleDelete(k: string) {
    if (busy) return;
    setBusy(true);
    try {
      const storageKey = k.replace(/^project-files\//, '');
      await supabaseBrowser.storage.from('project-files').remove([storageKey]);
      // pull current photos, remove key, update
      const { data, error: selErr } = await supabaseBrowser.from('rfi').select('photos').eq('id', rfiId).maybeSingle();
      if (selErr) throw selErr;
      const current: string[] = Array.isArray(data?.photos) ? data?.photos : [];
      const next = current.filter((p) => p !== k);
      const { error: updErr } = await supabaseBrowser.from('rfi').update({ photos: next }).eq('id', rfiId);
      if (updErr) throw updErr;
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.key} className="relative group rounded overflow-hidden border border-white/10 bg-white/5">
          {it.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.url} alt="RFI foto" className="w-full h-32 object-cover" />
          ) : (
            <div className="p-2 text-xs break-all">{it.key}</div>
          )}
          <button onClick={() => handleDelete(it.key)} className="absolute top-1 right-1 text-xs bg-red-500/80 hover:bg-red-500 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">
            Sil
          </button>
        </div>
      ))}
      {items.length === 0 && <div className="text-white/60">Fotoğraf yok</div>}
    </div>
  );
}
