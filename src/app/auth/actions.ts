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

export async function signup(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');
  
  if (!email || !password || !confirmPassword) {
    return { error: 'Lütfen tüm alanları doldurun.' };
  }
  
  if (password !== confirmPassword) {
    return { error: 'Şifreler eşleşmiyor. Lütfen tekrar kontrol edin.' };
  }
  
  if (password.length < 8) {
    return { error: 'Şifre en az 8 karakter olmalıdır.' };
  }
  
  try {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    });
    
    if (error) {
      console.error('Signup API error:', error);
      return { error: error.message };
    }
    
    // Log success data for debugging
    console.log('Signup success data:', data);
    
    return { success: 'Hesap oluşturuldu! Lütfen e-posta adresinize gönderilen doğrulama bağlantısına tıklayın.' };
  } catch (error) {
    console.error('Signup error:', error);
    return { error: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.' };
  }
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


