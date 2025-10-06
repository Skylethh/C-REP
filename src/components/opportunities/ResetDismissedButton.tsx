"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/button';

type ResetDismissedButtonProps = {
  projectId: string;
  className?: string;
  onReset?: () => void;
};

export function ResetDismissedButton({ projectId, className, onReset }: ResetDismissedButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch('/api/opportunities/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        });
        if (!response.ok) throw new Error(`reset_failed_${response.status}`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('opportunities:reset'));
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Gizlenen fırsatlar geri yüklendi', variant: 'success' } }));
        }
        onReset?.();
        router.refresh();
      } catch (err) {
        console.error('[opportunities] reset dismissed failed', err);
        setError('Gizlenen fırsatlar geri yüklenemedi. Lütfen tekrar deneyin.');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Gizlenen fırsatlar geri yüklenemedi', variant: 'error' } }));
        }
      }
    });
  };

  return (
    <div className={className}>
      <Button
        variant="ghost"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <RotateCcw className="h-4 w-4" aria-hidden />
        )}
        Gizlenenleri Geri Getir
      </Button>
      {error && (
        <p className="mt-1 text-xs text-red-300 max-w-xs text-left sm:text-right">
          {error}
        </p>
      )}
    </div>
  );
}

export default ResetDismissedButton;
