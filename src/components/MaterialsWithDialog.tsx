"use client";
import * as Dialog from '@radix-ui/react-dialog';
import EmissionEntryForm from '@/components/forms/EmissionEntryForm';
import { DailyLogMaterialsSection, type Activity as MaterialActivity, type MaterialRow } from '@/components/DailyLogMaterialsSection';
import { useState } from 'react';

export default function MaterialsWithDialog({ projectId, logId, activities, initial, dateDefault, action }: { projectId: string; logId: string; activities: MaterialActivity[]; initial: MaterialRow[]; dateDefault: string; action?: (formData: FormData) => void }) {
  const [open, setOpen] = useState(false);

  function handleSaved(res: { entryId: string; dailyLogMaterialId?: string; dailyLogMaterial?: MaterialRow }) {
    // Notify the list to append the new row optimistically
    if (typeof window !== 'undefined') {
      const row = (res.dailyLogMaterial as MaterialRow) ?? ({
        id: res.dailyLogMaterialId!,
        log_id: logId,
        activity_id: '',
        quantity: 0,
        unit: '',
        created_at: new Date().toISOString(),
      } as any);
      if (row?.id) {
        window.dispatchEvent(new CustomEvent('daily-log-material-added', { detail: row }));
      }
    }
    setOpen(false);
  }

  return (
    <div>
      <DailyLogMaterialsSection logId={logId} initial={initial} />
      <div className="mt-3 flex justify-end">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button className="btn-primary">+ Malzeme Ekle</button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl max-h-[90vh] rounded-xl bg-gradient-to-b from-emerald-950 to-ocean-950 border border-white/10 p-0 overflow-hidden shadow-glow-md z-50">
              <div className="p-5 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/3 backdrop-blur-md">
                <Dialog.Title className="text-xl font-medium highlight-text">Yeni Emisyon Kaydı</Dialog.Title>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(90vh-64px)]">
                <EmissionEntryForm
                  projectId={projectId}
                  defaultDate={new Date(dateDefault).toISOString().slice(0,10)}
                  mode="daily-log"
                  action={action}
                  apiSubmitUrl={action ? undefined : `/api/daily-logs/${logId}/entries`}
                  onSaved={handleSaved}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}
