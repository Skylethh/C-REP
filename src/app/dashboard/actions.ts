"use server";
import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function createProject(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  if (!name) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // For now, pick the first organization the user belongs to
  const c = await cookies();
  const activeOrg = c.get('active_org')?.value;
  if (!activeOrg) {
    // fallback to first org
    const { data: org } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (!org?.organization_id) return;
    c.set({ name: 'active_org', value: org.organization_id, httpOnly: false, path: '/', sameSite: 'lax' });
  }

  const orgId = activeOrg || (await cookies()).get('active_org')?.value;
  const { data, error } = await supabase.rpc('create_project', {
    p_org: orgId,
    p_owner: user.id,
    p_name: name,
    p_desc: description || null
  });

  if (error) throw error;
  revalidatePath('/dashboard');
}


