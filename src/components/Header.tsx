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
        <div className="container mx-auto px-6 md:px-12 lg:px-16 h-16 flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-leaf-400 to-ocean-400 p-1.5 rounded-lg shadow-glow-sm group-hover:shadow-glow-md transition-all">
              <Leaf className="text-white" size={20} />
            </div>
            <span className="font-semibold text-xl tracking-tight highlight-text">C-rep</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-sm text-white/80 hover:text-white transition-colors">
                Özellikler
              </Link>
              <Link href="#about" className="text-sm text-white/80 hover:text-white transition-colors">
                Hakkında
              </Link>
              <Link href="#testimonials" className="text-sm text-white/80 hover:text-white transition-colors">
                Referanslar
              </Link>
              <Link href="#contact" className="text-sm text-white/80 hover:text-white transition-colors">
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
          <div className="md:hidden glass mx-6 my-2 p-4 animate-in slide-in-from-top-5 duration-200 max-w-lg">
            <div className="flex flex-col space-y-4">
              <Link href="#features" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Özellikler
              </Link>
              <Link href="#about" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Hakkında
              </Link>
              <Link href="#testimonials" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Referanslar
              </Link>
              <Link href="#contact" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
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
      <div className="container mx-auto px-6 md:px-12 lg:px-16 h-16 flex items-center justify-between max-w-7xl">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="bg-gradient-to-br from-leaf-400 to-ocean-400 p-1.5 rounded-lg shadow-glow-sm group-hover:shadow-glow-md transition-all">
            <Leaf className="text-white" size={20} />
          </div>
          <span className="font-semibold text-xl tracking-tight highlight-text">C-rep</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-white/80 hover:text-white transition-colors">
              Dashboard
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
          
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
              {user.email}
            </span>
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="text-sm hover:text-leaf-400">
                Profil
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
        <div className="md:hidden glass mx-6 my-2 p-4 animate-in slide-in-from-top-5 duration-200 max-w-lg">
          <div className="flex flex-col space-y-4">
            <Link href="/dashboard" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Dashboard
            </Link>
            <Link href="/reports" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Raporlar
            </Link>
            <Link href="/opportunities" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Fırsatlar
            </Link>
            <Link href="/profile" className="text-white/80 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Profil
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}


