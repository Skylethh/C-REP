"use client";
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './button';
import { useState } from 'react';

export function CreateProjectDialog({ action }: { action: (fd: FormData) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button>Yeni Proje</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-lg bg-emerald-950 border border-white/10 p-6 space-y-4">
          <Dialog.Title className="text-lg font-semibold">Yeni Proje</Dialog.Title>
          <form
            action={async (fd) => {
              await action(fd);
              setOpen(false);
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="text-sm text-green-300/80">Ad</label>
              <input name="name" required className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-green-300/80">Açıklama</label>
              <textarea name="description" className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">İptal</Button>
              </Dialog.Close>
              <Button type="submit">Oluştur</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


