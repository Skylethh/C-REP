"use client";
import { supabaseBrowser } from '@/lib/client';
import { useEffect, useMemo, useState } from 'react';
import { Eye, Download, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from './button';

type Item = { key: string; url: string | null; name: string };

const normalizeKey = (k: string) => k.replace(/^project-files\//, '');
const nameFromKey = (k: string) => (k.split('/').pop() || k);

export function RfiPhotoGrid({ keys, projectId, rfiId }: { keys: string[]; projectId: string; rfiId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [viewing, setViewing] = useState<{ url: string; name: string } | null>(null);

  const uniqKeys = useMemo(() => Array.from(new Set(keys || [])), [keys]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Item[] = [];
      for (const raw of uniqKeys) {
        const storageKey = normalizeKey(raw);
        try {
          const { data, error } = await supabaseBrowser.storage
            .from('project-files')
            .createSignedUrl(storageKey, 60 * 60);
          out.push({ key: raw, url: error ? null : data?.signedUrl || null, name: nameFromKey(raw) });
        } catch {
          out.push({ key: raw, url: null, name: nameFromKey(raw) });
        }
      }
      if (alive) setItems(out);
    })();
    return () => {
      alive = false;
    };
  }, [uniqKeys.join('|')]);

  async function handleDownload(url: string | null, name: string) {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      window.open(url, '_blank');
    }
  }

  async function handleDelete(key: string) {
    if (deleting[key]) return;
    const prev = items;
    const next = prev.filter((it) => it.key !== key);
    setDeleting((d) => ({ ...d, [key]: true }));
    setItems(next);
    try {
      // Remove from storage
      const storageKey = normalizeKey(key);
      const { error: stErr } = await supabaseBrowser.storage.from('project-files').remove([storageKey]);
      if (stErr) throw stErr;
      // Update DB
      const { data, error: selErr } = await supabaseBrowser.from('rfi').select('photos').eq('id', rfiId).maybeSingle();
      if (selErr) throw selErr;
      const current: string[] = Array.isArray(data?.photos) ? data?.photos : [];
      const updated = current.filter((p) => p !== key);
      const { error: updErr } = await supabaseBrowser.from('rfi').update({ photos: updated }).eq('id', rfiId);
      if (updErr) throw updErr;
      if (viewing && prev.find((it) => it.key === key && it.url === viewing.url)) setViewing(null);
    } catch (e) {
      // Revert UI on failure
      setItems(prev);
      alert('Fotoğraf silinirken bir hata oluştu');
    } finally {
      setDeleting((d) => ({ ...d, [key]: false }));
    }
  }

  if (!items.length) {
    return <div className="text-white/60">Fotoğraf yok</div>;
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.key} className="group rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              {/* Thumbnail */}
              <div className="relative flex-shrink-0">
                {it.url ? (
                   
                  <img src={it.url} alt={it.name} className="w-16 h-16 object-cover rounded-lg border border-white/20" />
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center bg-white/10 rounded-lg border border-white/20">
                    <ImageIcon size={20} className="text-leaf-400" />
                  </div>
                )}
              </div>
              
              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate" title={it.name}>
                  {it.name}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                  <span>Fotoğraf</span>
                  <span>•</span>
                  <span>JPG</span>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {it.url && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewing({ url: it.url!, name: it.name })}
                      className="h-8 px-3 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30"
                      title="Görüntüle"
                    >
                      <Eye size={14} className="text-leaf-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(it.url, it.name)}
                      className="h-8 px-3 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30"
                      title="İndir"
                    >
                      <Download size={14} className="text-ocean-400" />
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(it.key)}
                  disabled={!!deleting[it.key]}
                  className="h-8 px-3 bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-400"
                  title="Sil"
                >
                  {deleting[it.key] ? 'Siliniyor...' : <Trash2 size={14} />}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/20">
              <div className="text-sm font-medium text-white truncate" title={viewing.name}>{viewing.name}</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="bg-white/5 border-white/20 hover:bg-white/10" onClick={() => handleDownload(viewing.url, viewing.name)}>
                  <Download size={14} className="mr-1" /> İndir
                </Button>
                <Button size="sm" variant="outline" className="bg-white/5 border-white/20 hover:bg-white/10" onClick={() => setViewing(null)}>
                  Kapat
                </Button>
              </div>
            </div>
            <div className="p-4 max-h-[calc(90vh-100px)] overflow-auto">
              { }
              <img src={viewing.url} alt={viewing.name} className="max-w-full h-auto mx-auto rounded" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
