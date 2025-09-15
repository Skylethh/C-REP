"use client";

import { useEffect, useState } from 'react';

type Toast = {
  id: number;
  message: string;
  variant?: 'success' | 'error' | 'info';
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let idSeq = 1;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string; variant?: Toast['variant'] };
      if (!detail?.message) return;
      const id = idSeq++;
      setToasts((prev) => [...prev, { id, message: detail.message, variant: detail.variant || 'info' }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };
    window.addEventListener('app-toast', handler as EventListener);
    return () => window.removeEventListener('app-toast', handler as EventListener);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            `min-w-[240px] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-glow-sm backdrop-blur ` +
            (t.variant === 'success'
              ? 'bg-emerald-900/80 border-emerald-500/30 text-green-100'
              : t.variant === 'error'
              ? 'bg-red-900/70 border-red-500/30 text-red-100'
              : 'bg-white/10 border-white/20 text-white')
          }
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}


