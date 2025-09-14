"use server";
import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export async function addMember(projectId: string, formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const role = String(formData.get('role') || 'viewer');
  if (!email) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: targetId } = await supabase.rpc('find_user_id_by_email', { p_email: email });
  if (!targetId) return;
  const { error } = await supabase.rpc('add_member', { p_project: projectId, p_actor: user.id, p_user: targetId, p_role: role });
  if (error) throw error;
  revalidatePath(`/projects/${projectId}/members`);
}

export async function removeMember(projectId: string, formData: FormData) {
  const userId = String(formData.get('user_id') || '');
  if (!userId) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.rpc('remove_member', { p_project: projectId, p_actor: user.id, p_user: userId });
  if (error) throw error;
  revalidatePath(`/projects/${projectId}/members`);
}


