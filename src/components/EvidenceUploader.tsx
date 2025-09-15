"use client";
import { supabaseBrowser } from '@/lib/client';
import { useState } from 'react';
import { Button } from './button';
import { useRouter } from 'next/navigation';

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex;
}

export function EvidenceUploader({ projectId, entryId, onUploaded }: { projectId: string; entryId?: string; onUploaded?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const router = useRouter();

  async function handleUpload() {
    if (!selectedFile) return;
    setBusy(true);
    setError(null);
    try {
      if (selectedFile.size > 10 * 1024 * 1024) throw new Error('Dosya 10MB üstünde');
      const hash = await sha256Hex(selectedFile);
      const ext = selectedFile.name.split('.').pop() || 'bin';
      const path = `evidence/${projectId}/${hash}.${ext}`;

      const { error: upErr } = await supabaseBrowser.storage.from('evidence').upload(path, selectedFile, {
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
        entry_id: entryId || null,
        file_path: path,
        mime: selectedFile.type || 'application/octet-stream',
        hash,
        size: selectedFile.size,
      });
      if (dbErr && dbErr.message?.includes('duplicate')) {
        // ok
      } else if (dbErr) {
        throw dbErr;
      }
      onUploaded?.();
      setSelectedFile(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Kanıt eklendi', variant: 'success' } }));
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Yükleme hatası');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: err.message || 'Yükleme hatası', variant: 'error' } }));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm shadow-sm">
      <div className="text-sm font-medium mb-3 text-white/80">Kanıt Ekle {entryId ? '(Kayda Bağlı)' : ''}</div>
      
      <div className="space-y-3">
        <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${selectedFile ? 'border-leaf-500/40 bg-leaf-500/5' : 'border-white/20 hover:border-white/30'}`}>
          {selectedFile ? (
            <div className="flex flex-col items-center">
              <div className="text-sm font-medium text-leaf-400 mb-1">{selectedFile.name}</div>
              <div className="text-xs text-white/60">{(selectedFile.size / 1024).toFixed(1)} KB</div>
              <button 
                onClick={() => setSelectedFile(null)} 
                className="mt-2 text-xs text-white/60 hover:text-white underline"
              >
                Değiştir
              </button>
            </div>
          ) : (
            <>
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-white/10 rounded-full mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                  <div className="text-sm font-medium text-white/80 mb-1">Dosya seç veya sürükle</div>
                  <div className="text-xs text-white/60">PNG, JPG veya PDF (max 10MB)</div>
                </div>
              </label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
              />
            </>
          )}
        </div>
        
        <div className="flex justify-between items-center gap-2">
          <Button 
            disabled={busy || !selectedFile} 
            onClick={handleUpload}
            className={`px-4 py-2 ${selectedFile ? 'bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500' : 'bg-white/20'}`}
          >
            {busy ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Yükleniyor...</span>
              </div>
            ) : 'Yükle'}
          </Button>
          {error ? (
            <div className="text-xs text-red-300 bg-red-500/10 px-3 py-1.5 rounded">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


