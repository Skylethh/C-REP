"use client";
import { supabaseBrowser } from '@/lib/client';
import { useState } from 'react';
import { Button } from './button';

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex;
}

export function EvidenceUploader({ projectId, onUploaded }: { projectId: string; onUploaded?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            if (file.size > 10 * 1024 * 1024) throw new Error('Dosya 10MB üstünde');
            const hash = await sha256Hex(file);
            const ext = file.name.split('.').pop() || 'bin';
            const path = `evidence/${projectId}/${hash}.${ext}`;

            const { error: upErr } = await supabaseBrowser.storage.from('evidence').upload(path, file, {
              upsert: false,
              cacheControl: '3600',
            });
            if (upErr && upErr.message.includes('exists')) {
              // already uploaded; continue to DB insert
            } else if (upErr) {
              throw upErr;
            }

            const { error: dbErr } = await supabaseBrowser.from('evidence_files').insert({
              project_id: projectId,
              file_path: path,
              mime: file.type || 'application/octet-stream',
              hash,
              size: file.size,
            });
            if (dbErr && dbErr.message?.includes('duplicate')) {
              // ok
            } else if (dbErr) {
              throw dbErr;
            }
            onUploaded?.();
          } catch (err: any) {
            setError(err.message || 'Yükleme hatası');
          } finally {
            setBusy(false);
            e.currentTarget.value = '';
          }
        }}
      />
      <div className="flex items-center gap-2">
        <Button disabled={busy} onClick={() => {}}>{busy ? 'Yükleniyor…' : 'Yükle'}</Button>
        {error ? <span className="text-red-400 text-sm">{error}</span> : null}
      </div>
    </div>
  );
}


