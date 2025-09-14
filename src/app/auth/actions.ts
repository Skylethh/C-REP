"use server";
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  if (!email || !password) redirect('/login?error=missing_credentials');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/login?error=' + encodeURIComponent(error.message));
  redirect('/dashboard');
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  if (!email || !password) redirect('/signup?error=missing_credentials');
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect('/signup?error=' + encodeURIComponent(error.message));
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function magicLink(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  if (!email) redirect('/login?error=missing_email');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000' }
  });
  if (error) redirect('/login?error=' + encodeURIComponent(error.message));
  redirect('/login?info=magic_link_sent');
}


