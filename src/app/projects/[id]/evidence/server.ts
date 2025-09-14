"use server";
import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export async function deleteEvidence(projectId: string, formData: FormData) {
  const id = String(formData.get('id') || '');
  const filePath = String(formData.get('file_path') || '');
  if (!id || !filePath) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.storage.from('evidence').remove([filePath]);
  await supabase.from('evidence_files').delete().eq('id', id);
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'evidence_deleted',
    resource: filePath,
    metadata: { project_id: projectId, evidence_id: id }
  } as any);
  revalidatePath(`/projects/${projectId}`);
}


