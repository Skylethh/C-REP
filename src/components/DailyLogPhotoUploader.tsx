"use client";
import { supabaseBrowser } from '@/lib/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function DailyLogPhotoUploader({ projectId, logId }: { projectId: string; logId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  async function handleUpload() {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('Max 15MB');
  const hash = await sha256Hex(file);
  const ext = file.name.split('.').pop() || 'bin';
  // Store object key WITHOUT the bucket prefix. Bucket is provided separately in storage.from('project-files')
  const key = `${projectId}/daily-logs/${logId}/${hash}.${ext}`;

  const { error: upErr } = await supabaseBrowser.storage.from('project-files').upload(key, file, { upsert: false, cacheControl: '3600' });
      if (upErr && !upErr.message?.includes('exists')) {
        console.error('Upload error (raw):', upErr);
        const details = (upErr as any)?.error || (upErr as any)?.hint || (upErr as any)?.message || JSON.stringify(upErr);
        throw new Error(`Yükleme başarısız: ${details}`);
      }

      // Append to daily_logs.photos with new structure
      const { data, error: selErr } = await supabaseBrowser.from('daily_logs').select('photos').eq('id', logId).maybeSingle();
      if (selErr) throw selErr;
      const current = Array.isArray(data?.photos) ? data?.photos : [];
      
      // Create new photo object with path and original filename
      const photoObj = {
        // Save path relative to bucket for consistency
        path: key,
        original_name: file.name
      };
      
      const next = [...current, photoObj];
      const { error: updErr } = await supabaseBrowser.from('daily_logs').update({ photos: next }).eq('id', logId);
      if (updErr) throw updErr;

      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Fotoğraf eklendi', variant: 'success' } }));
      setFile(null);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Yükleme hatası');
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message || 'Yükleme hatası', variant: 'error' } }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border border-white/10 bg-white/5 p-3">
      <div className="text-sm mb-2">Fotoğraf ekle</div>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button disabled={!file || busy} onClick={handleUpload} className="ml-2 btn-primary px-3 py-1.5">Yükle</button>
      {error && <div className="text-xs text-red-300 mt-2 whitespace-pre-wrap">{error}</div>}
    </div>
  );
}
