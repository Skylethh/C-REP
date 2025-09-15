import { requestPasswordReset } from '@/app/auth/server';
import { Button } from '@/components/button';
import Link from 'next/link';
import { Leaf, Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export default function ResetPasswordRequestPage({ searchParams }: { searchParams?: { [key: string]: string | undefined } }) {
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
            <h1 className="text-2xl md:text-3xl font-bold highlight-text mb-2">Şifre Sıfırlama</h1>
            <p className="text-white/60 text-sm">E-posta adresinize sıfırlama bağlantısı göndereceğiz</p>
          </div>
          
          {/* Alerts */}
          {(searchParams && 'error' in searchParams) ? (
            <div className="rounded-md border border-red-400/30 bg-red-950/30 text-red-200 px-4 py-3 text-sm mb-6 flex items-center">
              <span className="bg-red-500/20 p-1 rounded mr-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5V9M8 11.01L8.01 11M15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              {String(searchParams.error)}
            </div>
          ) : null}
          
          {(searchParams && 'info' in searchParams && searchParams.info === 'sent') ? (
            <div className="rounded-md border border-green-400/30 bg-emerald-900/40 text-green-200 px-4 py-3 text-sm mb-6 flex items-center">
              <span className="bg-green-500/20 p-1 rounded mr-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8L7.33333 9.33333L10 6.66667M14.6667 8C14.6667 11.6819 11.6819 14.6667 8 14.6667C4.3181 14.6667 1.33333 11.6819 1.33333 8C1.33333 4.3181 4.3181 1.33333 8 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              Sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.
            </div>
          ) : (
            <form action={requestPasswordReset} className="space-y-5">
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
              
              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500 py-3 rounded-lg shadow-glow-sm hover:shadow-glow-md transition-all flex items-center justify-center"
                >
                  <span>Sıfırlama Bağlantısı Gönder</span>
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </form>
          )}
          
          {/* Info Box */}
          <div className="mt-8 p-4 bg-ocean-900/30 border border-ocean-400/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="bg-ocean-500/20 p-2 rounded-full mt-0.5">
                <Mail size={16} className="text-ocean-300" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Şifre Sıfırlama İşlemi</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  E-posta adresinize bir sıfırlama bağlantısı göndereceğiz. 
                  Bağlantıya tıkladığınızda yeni şifrenizi belirleyebileceksiniz.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-white/60">
          <Link href="/login" className="flex items-center justify-center gap-2 text-leaf-400 hover:text-leaf-300 font-medium transition-colors">
            <ArrowLeft size={16} />
            <span>Giriş sayfasına dön</span>
          </Link>
        </div>
      </div>
    </div>
  );
}