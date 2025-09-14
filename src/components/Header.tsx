import { Leaf } from 'lucide-react';
import { LangSwitcher } from './LangSwitcher';
import Link from 'next/link';
import { Button } from './button';
import { signOut } from '@/app/auth/actions';

export function Header({ user }: { user?: { email?: string } | null }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-emerald-950/70 border-b border-white/10">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="text-green-400" size={20} />
          <span className="font-semibold">C-rep</span>
        </div>
        <nav className="hidden md:flex items-center gap-4 text-sm text-green-200">
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-green-400">Dashboard</Link>
              <Link href="/reports" className="hover:text-green-400">Raporlar</Link>
              <Link href="/opportunities" className="hover:text-green-400">Fırsatlar</Link>
            </>
          ) : null}
        </nav>
        <div className="flex items-center gap-3">
          <LangSwitcher />
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-300/80">{user.email}</span>
              <form action={signOut}>
                <Button type="submit" variant="ghost" className="text-sm">Çıkış</Button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"><Button variant="ghost">Giriş</Button></Link>
              <Link href="/signup"><Button>Kayıt Ol</Button></Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


