"use client";
import { supabaseBrowser } from '@/lib/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function ProjectDocumentUploader({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const router = useRouter();

  async function handleUpload() {
    if (!file || !code || !name) return;
    setBusy(true); setError(null);
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('Max 50MB');
      const hash = await sha256Hex(file);
      const ext = file.name.split('.').pop() || 'bin';
      const safeCode = code.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
      const key = `project-files/${projectId}/docs/${safeCode}/${hash}.${ext}`;

      const { error: upErr } = await supabaseBrowser.storage.from('project-files').upload(key, file, {
        upsert: false,
        cacheControl: '3600',
      });
      if (upErr && !upErr.message?.includes('exists')) throw upErr;

      const { data: auth } = await supabaseBrowser.auth.getUser();
      const actor = auth.user?.id as string;
      if (!actor) throw new Error('Not authenticated');

      const { error: rpcErr } = await supabaseBrowser.rpc('create_or_update_document', {
        p_project: projectId,
        p_actor: actor,
        p_code: code,
        p_name: name,
        p_file_path: key,
        p_mime: file.type || 'application/octet-stream',
        p_size: file.size,
        p_hash: hash,
        p_note: note || null,
      });
      if (rpcErr) throw rpcErr;

      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Doküman yüklendi', variant: 'success' } }));
      setFile(null);
      setCode("");
      setName("");
  setNote("");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Yükleme hatası');
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message || 'Yükleme hatası', variant: 'error' } }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="form-input" placeholder="Kod (ör: MIM-PAFTA-A01)" value={code} onChange={(e) => setCode(e.target.value)} />
        <input className="form-input md:col-span-2" placeholder="Ad (ör: Mimari Pafta A01)" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="file" className="form-input" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      <div>
        <input className="form-input w-full" placeholder="Revizyon notu (opsiyonel)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <button disabled={busy || !file || !code || !name} onClick={handleUpload} className="btn-primary">Yükle / Revizyon Ekle</button>
        {error && <div className="text-xs text-red-300">{error}</div>}
      </div>
    </div>
  );
}
