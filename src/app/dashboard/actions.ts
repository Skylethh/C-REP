"use server";
import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().trim().min(2, 'Proje adı en az 2 karakter olmalı').max(100, 'Proje adı en fazla 100 karakter olabilir'),
  description: z.string().trim().max(500, 'Açıklama en fazla 500 karakter olabilir').optional().default('')
});

function sanitizeText(input: unknown, maxLen: number) {
  const text = String(input ?? '').trim();
  // Strip control chars and collapse whitespace
  const cleaned = text.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ');
  return cleaned.slice(0, maxLen);
}

export async function createProject(_prevState: any, formData: FormData) {
  try {
    const parsed = projectSchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description')
    });
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Form doğrulama hatası';
      return { ok: false, error: message };
    }
    const name = sanitizeText(parsed.data.name, 100);
    const description = sanitizeText(parsed.data.description || '', 500);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Giriş yapmanız gerekiyor' };

    // For now, pick/set the first organization the user belongs to
    const c = await cookies();
    let orgId = c.get('active_org')?.value || '';
    if (!orgId) {
      const { data: org, error: orgErr } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (orgErr) return { ok: false, error: orgErr.message };
      if (!org?.organization_id) return { ok: false, error: 'Organizasyon bulunamadı' };
      orgId = org.organization_id as string;
      c.set({ name: 'active_org', value: orgId, httpOnly: false, path: '/', sameSite: 'lax' });
    }

    const { error } = await supabase.rpc('create_project', {
      p_org: orgId,
      p_owner: user.id,
      p_name: name,
      p_desc: description || null
    });
    if (error) return { ok: false, error: error.message || 'Proje oluşturulamadı' };

    revalidatePath('/dashboard');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Beklenmeyen bir hata oluştu' };
  }
}

const updateProjectSchema = z.object({
  id: z.string().uuid('Geçersiz proje id'),
  name: z.string().trim().min(2, 'Proje adı en az 2 karakter olmalı').max(100),
  description: z.string().trim().max(500).optional().default('')
});

export async function updateProject(_prev: any, formData: FormData) {
  try {
    const parsed = updateProjectSchema.safeParse({
      id: formData.get('id'),
      name: formData.get('name'),
      description: formData.get('description')
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || 'Form doğrulama hatası' };
    const { id } = parsed.data;
    const name = sanitizeText(parsed.data.name, 100);
    const description = sanitizeText(parsed.data.description || '', 500);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Giriş yapmanız gerekiyor' };

    const { error } = await supabase
      .from('projects')
      .update({ name, description })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) return { ok: false, error: error.message || 'Proje güncellenemedi' };
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Beklenmeyen bir hata oluştu' };
  }
}

export async function deleteProject(_prev: any, formData: FormData) {
  try {
    const id = String(formData.get('id') || '');
    if (!id) return { ok: false, error: 'Geçersiz proje id' };
    const redirectToRaw = String(formData.get('redirectTo') || '');
    // Only allow same-site absolute paths like "/projects" or "/dashboard?tab=x"
    const safeRedirect = redirectToRaw && redirectToRaw.startsWith('/') ? redirectToRaw : '';

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Giriş yapmanız gerekiyor' };

    // Deleting a project may cascade delete related rows (depending on FKs) and audit triggers
    // will try to insert into audit_logs. Ensure audit_logs has an insert policy that allows
    // authenticated users to insert (see db/migrations/053_* and 062_*). Otherwise a RLS error may occur.
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    if (error) return { ok: false, error: error.message || 'Proje silinemedi' };
    revalidatePath('/dashboard');
    if (safeRedirect) {
      // Navigate away immediately to avoid showing a not-found on the deleted project's page
      redirect(safeRedirect as any);
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Beklenmeyen bir hata oluştu' };
  }
}


