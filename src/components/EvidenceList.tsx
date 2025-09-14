"use client";
import { supabaseBrowser } from '@/lib/client';
import { deleteEvidence } from '@/app/projects/[id]/evidence/server';
import { useEffect, useState } from 'react';

export function EvidenceList({ items }: { items: { id: string; file_path: string; size: number; mime?: string }[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const next: Record<string, string> = {};
      for (const it of items) {
        const { data } = await supabaseBrowser.storage.from('evidence').createSignedUrl(it.file_path, 60);
        if (data?.signedUrl) next[it.id] = data.signedUrl;
      }
      setUrls(next);
    })();
  }, [items]);
  return (
    <ul className="space-y-2">
      {items.map((f) => (
        <li key={f.id} className="rounded-md border border-white/10 p-3 bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {f.mime?.startsWith('image/') && urls[f.id] ? (
                <img src={urls[f.id]} alt="thumb" className="h-10 w-10 object-cover rounded" />
              ) : null}
              <a href={urls[f.id]} target="_blank" rel="noreferrer" className="underline truncate max-w-[50ch]">
                {f.file_path}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-300/80 text-sm">{Math.round(f.size/1024)} KB</span>
              <form action={deleteEvidence.bind(null, f.file_path.split('/')[1])}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="file_path" value={f.file_path} />
                <button className="text-red-400 text-sm underline" type="submit">Sil</button>
              </form>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}


