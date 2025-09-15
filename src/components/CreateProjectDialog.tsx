"use client";
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './button';
import { useEffect, useState, useActionState } from 'react';
import { createProject } from '@/app/dashboard/actions';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button 
      type="submit" 
      className="bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500"
      disabled={pending}
    >
      {pending ? 'Oluşturuluyor…' : 'Oluştur'}
    </Button>
  );
}

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [state, formAction] = useActionState(createProject as any, { ok: false } as any);

  useEffect(() => {
    if (state?.ok) {
      setSuccess('Proje oluşturuldu');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Proje oluşturuldu', variant: 'success' } }));
      }
      setError(null);
      // close dialog shortly after success
      const t = setTimeout(() => setOpen(false), 600);
      return () => clearTimeout(t);
    } else if (state?.error) {
      setError(state.error);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: state.error, variant: 'error' } }));
      }
      setSuccess(null);
    }
  }, [state]);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button data-dialog-trigger="create-project" className="bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500">
          <span>Yeni Proje</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl bg-gradient-to-b from-emerald-950 to-ocean-950 border border-white/10 p-0 overflow-hidden shadow-glow-md z-50">
          <div className="p-5 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/3 backdrop-blur-md">
            <Dialog.Title className="text-xl font-medium highlight-text">Yeni Proje Oluştur</Dialog.Title>
          </div>
          
          <div className="p-6 space-y-5">
            <form action={formAction} className="space-y-5">
              {error ? (
                <div className="rounded-md border border-red-400/30 bg-red-500/10 text-red-200 px-4 py-3 text-sm flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 mt-0.5 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>{error}</span>
                </div>
              ) : null}
              
              {success ? (
                <div className="rounded-md border border-green-400/30 bg-green-500/10 text-green-200 px-4 py-3 text-sm flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 mt-0.5 flex-shrink-0">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>{success}</span>
                </div>
              ) : null}
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="form-label">
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                      </svg>
                      Proje Adı
                    </span>
                  </label>
                  <input 
                    name="name" 
                    required 
                    placeholder="Örn: Ofis Binası Renovasyonu"
                    className="form-input" 
                    autoFocus
                  />
                  <p className="text-xs text-white/50 mt-1">Projeniz için benzersiz ve tanımlayıcı bir isim girin.</p>
                </div>
                
                <div className="space-y-2">
                  <label className="form-label">
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                      </svg>
                      Açıklama
                    </span>
                  </label>
                  <textarea 
                    name="description" 
                    placeholder="Projenizin kısa bir açıklamasını girin..."
                    rows={4}
                    className="form-input" 
                  />
                  <p className="text-xs text-white/50 mt-1">Proje kapsamı, amacı veya hedeflenen sonuçları hakkında kısa bilgi (opsiyonel).</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost" className="px-4 py-2">İptal</Button>
                </Dialog.Close>
                <SubmitButton />
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


