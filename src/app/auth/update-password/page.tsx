"use client";

import { updatePassword } from '@/app/auth/server';
import { Button } from '@/components/button';
import { supabaseBrowser } from '@/lib/client';
import { Leaf, Lock, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function UpdatePasswordPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(searchParams?.error ? String(searchParams.error) : null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      const hasWindow = typeof window !== 'undefined';
      const hash = hasWindow ? window.location.hash : '';
      const search = hasWindow ? window.location.search : '';
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(search.replace(/^\?/, ''));

      const hashAccessToken = hashParams.get('access_token');
      const hashRefreshToken = hashParams.get('refresh_token');
      const codeParam = queryParams.get('code');

      try {
        if (hashAccessToken && hashRefreshToken) {
          const { error: sessionError } = await supabaseBrowser.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken
          });
          if (sessionError && !cancelled) {
            setError('Bağlantı geçersiz veya süresi dolmuş görünüyor. Lütfen yeni bir sıfırlama bağlantısı isteyin.');
          }
          if (!sessionError && hasWindow) {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          }
        } else if (codeParam) {
          const { error: codeError } = await supabaseBrowser.auth.exchangeCodeForSession(codeParam);
          if (codeError && !cancelled) {
            setError('Bağlantı doğrulanırken bir sorun oluştu. Lütfen yeni bir sıfırlama bağlantısı isteyin.');
          } else if (hasWindow) {
            const cleaned = new URL(window.location.href);
            cleaned.searchParams.delete('code');
            cleaned.searchParams.delete('type');
            cleaned.searchParams.delete('next');
            window.history.replaceState({}, document.title, cleaned.pathname + cleaned.search + cleaned.hash);
          }
        }
      } catch (sessionErr) {
        if (!cancelled) {
          setError('Oturum kurulurken bir sorun oluştu. Lütfen yeniden deneyin.');
        }
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    }

    hydrateSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset error state
    setError(null);
    
    // Validate passwords
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor. Lütfen tekrar kontrol edin.');
      return;
    }
    
    // Submit the form
    const form = e.currentTarget;
    form.submit();
  };

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
            <h1 className="text-2xl md:text-3xl font-bold highlight-text mb-2">Yeni Şifre Oluştur</h1>
            <p className="text-white/60 text-sm">Lütfen hesabınız için yeni bir şifre belirleyin</p>
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
          
          <form action={updatePassword} onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm text-white/70 font-medium flex items-center">
                <Lock size={16} className="mr-2 text-leaf-400" />
                Yeni Şifre
              </label>
              <div className="relative">
                <input 
                  name="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  type="password" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-leaf-400/50 focus:border-leaf-400/50 transition-all" 
                />
              </div>
              <p className="text-xs text-white/50 mt-1">Şifrenizi doğrulamak için tekrar girin</p>
            </div>
            
            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={!sessionReady}
                className="w-full bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500 py-3 rounded-lg shadow-glow-sm hover:shadow-glow-md transition-all flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{sessionReady ? 'Şifreyi Güncelle' : 'Bağlantı doğrulanıyor…'}</span>
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </form>
          
          {/* Security Info */}
          <div className="mt-8 p-4 bg-ocean-900/30 border border-ocean-400/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="bg-ocean-500/20 p-2 rounded-full mt-0.5">
                <ShieldCheck size={16} className="text-ocean-300" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Güvenli Şifre Önerileri</h3>
                <p className="text-xs text-white/70 leading-relaxed mb-2">
                  Güçlü bir şifre için aşağıdaki önerileri dikkate alın:
                </p>
                <ul className="space-y-1">
                  <li className="flex items-center text-xs text-white/70">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-leaf-400 to-ocean-400 flex items-center justify-center mr-2">
                      <Check size={10} className="text-white" />
                    </div>
                    En az 8 karakter uzunluğunda olmalı
                  </li>
                  <li className="flex items-center text-xs text-white/70">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-leaf-400 to-ocean-400 flex items-center justify-center mr-2">
                      <Check size={10} className="text-white" />
                    </div>
                    Büyük ve küçük harfler içermeli
                  </li>
                  <li className="flex items-center text-xs text-white/70">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-leaf-400 to-ocean-400 flex items-center justify-center mr-2">
                      <Check size={10} className="text-white" />
                    </div>
                    Rakam ve özel karakterler içermeli
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}