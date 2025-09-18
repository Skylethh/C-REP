"use server";

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Route } from 'next';

export async function deleteEntryAction(formData: FormData) {
  const entryId = String(formData.get('entryId') || '');
  const redirectTo = String(formData.get('redirectTo') || '') || '/entries';
  if (!entryId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.rpc('delete_entry_privileged', {
    p_user_id: user.id,
    p_entry_id: entryId
  });

  revalidatePath(redirectTo);
  redirect((redirectTo as unknown) as Route);
}

export async function updateEntryNotesAction(formData: FormData) {
  const entryId = String(formData.get('entryId') || '');
  const notes = String(formData.get('notes') || '');
  const redirectTo = String(formData.get('redirectTo') || '') || '/entries';
  if (!entryId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.rpc('update_entry_notes_privileged', {
    p_user_id: user.id,
    p_entry_id: entryId,
    p_notes: notes
  });

  revalidatePath(redirectTo);
  redirect((redirectTo as unknown) as Route);
}
