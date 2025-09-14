"use client";

import { signup } from '@/app/auth/actions';
import { Button } from '@/components/button';
import Link from 'next/link';
import { Leaf, Mail, Lock, User, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-gradient-to-br from-leaf-400 to-ocean-400 p-2 rounded-lg shadow-glow-md">
            <Leaf className="text-white" size={28} />
          </div>
        </div>
        
        {/* Card */}
        <div className="glass p-8 rounded-2xl border border-white/10 backdrop-blur-lg shadow-glow-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold highlight-text mb-2">Hesap Oluştur</h1>
            <p className="text-white/60 text-sm">Karbon emisyonlarınızı yönetmeye hemen başlayın</p>
          </div>
          
          {/* Alerts */}
          {error ? (
            <div className="rounded-md border border-red-400/30 bg-red-950/30 text-red-200 px-4 py-3 text-sm mb-6 flex items-center">
              <span className="bg-red-500/20 p-1 rounded mr-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5V9M8 11.01L8.01 11M15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              {error}
            </div>
          ) : null}
          
          {success ? (
            <div className="rounded-md border border-green-400/30 bg-emerald-900/40 text-green-200 px-4 py-3 text-sm mb-6 flex items-center">
              <span className="bg-green-500/20 p-1 rounded mr-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8L7.33333 9.33333L10 6.66667M14.6667 8C14.6667 11.6819 11.6819 14.6667 8 14.6667C4.3181 14.6667 1.33333 11.6819 1.33333 8C1.33333 4.3181 4.3181 1.33333 8 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              {success}
            </div>
          ) : null}
          
          {/* Signup Form */}
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const result = await signup(formData);
            
            if ('error' in result) {
              setError(result.error);
              setSuccess(null);
            } else if ('success' in result) {
              setSuccess(result.success);
              setError(null);
              // Redirect to login page after 2 seconds
              setTimeout(() => {
                window.location.href = '/login';
              }, 2000);
            }
          }} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm text-white/70 font-medium flex items-center">
                <Mail size={16} className="mr-2 text-leaf-400" />
                E-posta
              </label>
              <div className="relative">
                <input 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="ornek@mail.com"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-leaf-400/50 focus:border-leaf-400/50 transition-all" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-white/70 font-medium flex items-center">
                <Lock size={16} className="mr-2 text-leaf-400" />
                Şifre
              </label>
              <div className="relative">
                <input 
                  name="password" 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-leaf-400/50 focus:border-leaf-400/50 transition-all" 
                />
              </div>
              <p className="text-xs text-white/50 mt-1">En az 8 karakter kullanın</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-white/70 font-medium flex items-center">
                <Lock size={16} className="mr-2 text-leaf-400" />
                Şifreyi Tekrar Girin
              </label>
              <div className="relative">
                <input 
                  name="confirmPassword" 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-leaf-400/50 focus:border-leaf-400/50 transition-all" 
                />
              </div>
              <p className="text-xs text-white/50 mt-1">Şifrenizi doğrulamak için tekrar girin</p>
            </div>
            
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500 py-3 rounded-lg shadow-glow-sm hover:shadow-glow-md transition-all flex items-center justify-center"
              >
                <span>Hesap Oluştur</span>
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </form>
          
          {/* Email Verification Notice */}
          <div className="mt-8 p-4 bg-ocean-900/30 border border-ocean-400/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="bg-ocean-500/20 p-2 rounded-full mt-0.5">
                <Mail size={16} className="text-ocean-300" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-1">E-posta Doğrulaması</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Hesap oluşturulduktan sonra e-posta adresinize bir doğrulama bağlantısı gönderilecektir. 
                  Hesabınızı aktifleştirmek için lütfen e-postanızı kontrol edin ve doğrulama bağlantısına tıklayın.
                </p>
              </div>
            </div>
          </div>
          
          {/* Features */}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-medium text-white/70">Hesabınızla birlikte:</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-leaf-400 to-ocean-400 flex items-center justify-center mr-3">
                  <Check size={12} className="text-white" />
                </div>
                <span className="text-sm text-white/60">Proje bazlı karbon emisyonu takibi</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-leaf-400 to-ocean-400 flex items-center justify-center mr-3">
                  <Check size={12} className="text-white" />
                </div>
                <span className="text-sm text-white/60">Detaylı raporlama ve analizler</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-leaf-400 to-ocean-400 flex items-center justify-center mr-3">
                  <Check size={12} className="text-white" />
                </div>
                <span className="text-sm text-white/60">Ekip üyeleri ile iş birliği</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-white/60">
          Zaten hesabın var mı? 
          <Link href="/login" className="text-leaf-400 hover:text-leaf-300 ml-1 font-medium transition-colors">
            Giriş Yap
          </Link>
        </div>
      </div>
    </div>
  );
}


