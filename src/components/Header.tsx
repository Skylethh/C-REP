"use client";

import { Leaf, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from './button';
import { useState } from 'react';

export function Header({ user }: { user?: { email?: string } | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Landing page header (no user logged in)
  if (!user) {
    return (
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-gradient-to-r from-emerald-950/80 to-ocean-950/80 border-b border-white/10 shadow-md">
  <div className="app-container h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-leaf-400 to-ocean-400 p-1.5 rounded-lg shadow-glow-sm group-hover:shadow-glow-md transition-all">
              <Leaf className="text-white" size={20} />
            </div>
            <span className="font-semibold text-xl tracking-tight highlight-text">C-REP</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-sm text-white/80 hover:text-white transition-colors">
                Özellikler
              </Link>
              <Link href="#how-it-works" className="text-sm text-white/80 hover:text-white transition-colors">
                Nasıl Çalışır
              </Link>
              <Link href="#footer" className="text-sm text-white/80 hover:text-white transition-colors">
                İletişim
              </Link>
            </div>
            
            {/* Language selector */}
            <div className="flex items-center">
              <Link href="#" className="text-sm text-white/70 hover:text-white transition-colors">
                TR
              </Link>
              <span className="mx-1 text-white/30">|</span>
              <Link href="#" className="text-sm text-white/70 hover:text-white transition-colors">
                EN
              </Link>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" className="text-sm hover:text-leaf-400">
                  Giriş
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500 text-white shadow-glow-sm">
                  Hesap Oluştur
                </Button>
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <button 
              className="md:hidden p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass mx-4 my-2 p-4 animate-in slide-in-from-top-5 duration-200 max-w-lg">
            <div className="flex flex-col space-y-4">
              <Link href="#features" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Özellikler
              </Link>
              <Link href="#how-it-works" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Nasıl Çalışır
              </Link>
              <Link href="#footer" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
                İletişim
              </Link>
              <div className="flex items-center gap-2 pt-2 border-t border-white/10 mt-2">
                <Link href="/login" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full">Giriş</Button>
                </Link>
                <Link href="/signup" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-leaf-600 to-ocean-600">Hesap Oluştur</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  }
  
  // Dashboard header (user logged in) - This is separate from landing page
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-gradient-to-r from-emerald-950/80 to-ocean-950/80 border-b border-white/10 shadow-md">
  <div className="app-container h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="bg-gradient-to-br from-leaf-400 to-ocean-400 p-1.5 rounded-lg shadow-glow-sm group-hover:shadow-glow-md transition-all">
            <Leaf className="text-white" size={20} />
          </div>
          <span className="font-semibold text-xl tracking-tight highlight-text">C-REP</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <Link href={"/projects" as any} className="text-sm text-white/80 hover:text-white transition-colors">
              Projeler
            </Link>
            <Link href="/reports" className="text-sm text-white/80 hover:text-white transition-colors">
              Raporlar
            </Link>
            <Link href="/opportunities" className="text-sm text-white/80 hover:text-white transition-colors">
              Fırsatlar
            </Link>
          </div>
          
          {/* Language selector */}
          <div className="flex items-center">
            <Link href="#" className="text-sm text-white/70 hover:text-white transition-colors">
              TR
            </Link>
            <span className="mx-1 text-white/30">|</span>
            <Link href="#" className="text-sm text-white/70 hover:text-white transition-colors">
              EN
            </Link>
          </div>
          
          {/* User profile dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
              <span className="hidden sm:inline text-sm font-medium text-white/90 bg-white/10 px-3 py-1 rounded-full">
                {user.email ? user.email.split('@')[0] : 'Kullanıcı'}
              </span>
              <span className="text-sm font-medium text-white">Profil</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:rotate-180">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            
            {/* Dropdown menu */}
            <div className="absolute right-0 mt-1 w-56 rounded-lg shadow-glow-sm backdrop-blur-xl bg-gradient-to-b from-emerald-900/90 to-ocean-950/90 border border-white/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                <p className="text-sm font-medium text-white truncate">{user.email}</p>
                <p className="text-xs text-white/60 mt-1">Kullanıcı</p>
              </div>
              
              <div className="py-2">
                <Link href={"/profile" as any} className="flex items-center px-4 py-2.5 text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-leaf-400">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profil Ayarları
                </Link>
                {/* Organizasyon sayfası kaldırıldı */}
                <div className="border-t border-white/10 my-1"></div>
                <button 
                  className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-300 hover:text-red-200 hover:bg-red-950/30 transition-colors"
                  onClick={async () => {
                    try {
                      const { signOut } = await import('@/app/auth/actions');
                      await signOut();
                    } catch (error) {
                      console.error("Çıkış yapılırken hata oluştu:", error);
                      window.location.href = "/"; // Fallback redirect
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
  <div className="md:hidden glass mx-4 my-2 p-4 animate-in slide-in-from-top-5 duration-200 max-w-lg">
          <div className="flex flex-col space-y-4">
            <Link href={"/projects" as any} className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Projeler
            </Link>
            <Link href="/reports" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Raporlar
            </Link>
            <Link href="/opportunities" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Fırsatlar
            </Link>
            <Link href={"/profile" as any} className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Profil Ayarları
            </Link>
            <button 
              className="flex items-center text-red-300 hover:text-red-200 transition-colors text-left w-full py-2"
              onClick={async () => {
                setMobileMenuOpen(false);
                try {
                  const { signOut } = await import('@/app/auth/actions');
                  await signOut();
                } catch (error) {
                  console.error("Çıkış yapılırken hata oluştu:", error);
                  window.location.href = "/"; // Fallback redirect
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </header>
  );
}


