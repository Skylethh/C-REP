"use client";

import { useActionState, useEffect, useState } from 'react';
import { updateProject, deleteProject } from '@/app/dashboard/actions';

export function ProjectRowActions({ id, name, description }: { id: string; name: string; description?: string }) {
  const [editing, setEditing] = useState(false);

  const [updateState, updateAction] = useActionState(updateProject as any, { ok: false } as any);
  const [deleteState, deleteAction] = useActionState(deleteProject as any, { ok: false } as any);

  useEffect(() => {
    if (updateState?.ok) setEditing(false);
  }, [updateState]);

  return (
    <div className="ml-auto flex items-center gap-3">
      {!editing ? (
        <>
          <button 
            className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-md transition-all duration-200 text-white/90 hover:text-white" 
            onClick={() => setEditing(true)}
          >
            Düzenle
          </button>
          <button
            className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/20 hover:border-red-400/30 rounded-md transition-all duration-200 text-red-300 hover:text-red-200"
            onClick={async () => {
              if (!confirm('Bu projeyi silmek istediğinize emin misiniz?')) return;
              const fd = new FormData();
              fd.append('id', id);
              const res = await deleteAction(fd);
              if (typeof window !== 'undefined') {
                if (res?.ok) {
                  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Proje silindi', variant: 'success' } }));
                } else if (res?.error) {
                  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: res.error, variant: 'error' } }));
                }
              }
            }}
          >
            Sil
          </button>
          {deleteState?.error ? (
            <span className="text-xs text-red-300/90 bg-red-500/10 px-2 py-0.5 rounded">{deleteState.error}</span>
          ) : null}
        </>
      ) : (
        <form action={async (fd) => {
          const res = await updateAction(fd);
          if (typeof window !== 'undefined') {
            if (res?.ok) {
              window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Proje güncellendi', variant: 'success' } }));
            } else if (res?.error) {
              window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: res.error, variant: 'error' } }));
            }
          }
        }} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={id} />
          <input name="name" defaultValue={name} className="form-input text-xs py-1.5" placeholder="Proje adı" />
          <input name="description" defaultValue={description || ''} className="form-input text-xs py-1.5" placeholder="Açıklama (opsiyonel)" />
          <button className="text-xs bg-gradient-to-r from-leaf-600/80 to-ocean-600/80 hover:from-leaf-500 hover:to-ocean-500 px-3 py-1.5 rounded-md text-white transition-all duration-200 shadow-sm hover:shadow-md">Kaydet</button>
          <button type="button" className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-md transition-all duration-200 text-white/80 hover:text-white" onClick={() => setEditing(false)}>İptal</button>
          {updateState?.error ? (
            <span className="text-xs text-red-300/90 bg-red-500/10 px-2 py-0.5 rounded w-full mt-1">{updateState.error}</span>
          ) : null}
        </form>
      )}
    </div>
  );
}


