"use server";
import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  if (!email) redirect(('/auth/reset?error=missing_email') as Route);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + '/auth/update-password'
  });
  if (error) redirect(('/auth/reset?error=' + encodeURIComponent(error.message)) as Route);
  redirect(('/auth/reset?info=sent') as Route);
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') || '');
  if (!password) redirect(('/auth/update-password?error=missing_password') as Route);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(('/auth/update-password?error=' + encodeURIComponent(error.message)) as Route);
  redirect(('/login?info=password_updated') as Route);
}


