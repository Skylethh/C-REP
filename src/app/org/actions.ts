"use server";
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Route } from 'next';

export async function switchOrg(formData: FormData) {
  const orgId = String(formData.get('org_id') || '');
  if (!orgId) return;
  const c = await cookies();
  c.set({ name: 'active_org', value: orgId, httpOnly: false, path: '/', sameSite: 'lax' });
  const h = await headers();
  const referer = h.get('referer');
  try { if (referer) redirect((new URL(referer).pathname as Route)); } catch {}
  redirect(('/dashboard') as Route);
}


