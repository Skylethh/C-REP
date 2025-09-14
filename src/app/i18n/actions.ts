"use server";
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import type { Locale } from '@/i18n/messages';

export async function switchLocale(formData: FormData) {
  const locale = formData.get('locale') as Locale | null;
  if (!locale) return;
  const c = await cookies();
  c.set({ name: 'locale', value: locale, httpOnly: false, path: '/', sameSite: 'lax' });
  const h = await headers();
  const referer = h.get('referer');
  try {
    if (referer) redirect(new URL(referer).pathname);
  } catch {}
  redirect('/');
}


