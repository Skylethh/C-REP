"use client";

export function ResetDismissButton({ projectId, className }: { projectId: string; className?: string }) {
  return (
    <button
      onClick={async () => {
        try {
          await fetch('/api/opportunities/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
          });
          if (typeof window !== 'undefined') window.location.reload();
        } catch {}
      }}
      className={className ?? "bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/15 px-3 py-1.5 rounded-lg text-sm transition-all duration-200"}
    >
      Gizlenenleri Geri Getir
    </button>
  );
}

export default ResetDismissButton;
