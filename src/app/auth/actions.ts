"use server";
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { createClient } from '@/lib/server';

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  if (!email || !password) redirect(('/login?error=missing_credentials') as Route);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(('/login?error=' + encodeURIComponent(error.message)) as Route);
  redirect(('/dashboard') as Route);
}

export async function signup(_formData: FormData) {
  // Registration is closed — C-REP is in private beta.
  // New users are onboarded manually after a demo request.
  return { error: 'Kayıt şu anda kapalıdır. Demo talep etmek için iletişim formumuzu kullanın.' };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function magicLink(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  if (!email) redirect(('/login?error=missing_email') as Route);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000' }
  });
  if (error) redirect(('/login?error=' + encodeURIComponent(error.message)) as Route);
  redirect(('/login?info=magic_link_sent') as Route);
}


