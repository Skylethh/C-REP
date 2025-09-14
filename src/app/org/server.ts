"use server";
import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export async function createOrganization(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  if (!name) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc('create_organization', { p_name: name, p_owner: user.id });
  revalidatePath('/org');
}


