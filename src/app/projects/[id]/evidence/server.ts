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
  // Check permission: allow if user is creator of evidence or project editor/owner
  const { data: ev, error: evErr } = await supabase
    .from('evidence_files')
    .select('id, project_id, created_by')
    .eq('id', id)
    .maybeSingle();
  if (evErr || !ev) return;

  const isCreator = ev.created_by === user.id;
  let isEditor = false;
  if (!isCreator) {
    const { data: pm } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', ev.project_id)
      .eq('user_id', user.id)
      .maybeSingle();
    isEditor = pm?.role === 'owner' || pm?.role === 'editor';
  }
  if (!isCreator && !isEditor) return;
  // Proceed with storage removal and DB delete
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


