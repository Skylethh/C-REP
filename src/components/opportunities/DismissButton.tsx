"use client";

import { Button } from '@/components/button';

export function DismissButton({ projectId, opportunityId, ruleId, className }: { projectId: string; opportunityId: string; ruleId: string; className?: string }) {
  return (
    <Button
      variant="ghost"
      className={className}
      onClick={async () => {
        try {
          await fetch('/api/opportunities/dismiss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, opportunityId, ruleId }),
          });
          if (typeof window !== 'undefined') window.location.reload();
        } catch {}
      }}
    >
      Gizle
    </Button>
  );
}

export default DismissButton;
