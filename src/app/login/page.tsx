import { login, magicLink } from '@/app/auth/actions';
import { Button } from '@/components/button';
import Link from 'next/link';

export default function LoginPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Giriş Yap</h1>
      {searchParams?.error ? (
        <div className="rounded-md border border-red-400/30 bg-red-950/30 text-red-200 px-3 py-2 text-sm">
          {String(searchParams.error)}
        </div>
      ) : null}
      {searchParams?.info ? (
        <div className="rounded-md border border-green-400/30 bg-emerald-900/40 text-green-200 px-3 py-2 text-sm">
          {String(searchParams.info)}
        </div>
      ) : null}
      <form action={login} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">E-posta</label>
          <input name="email" type="email" required className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">Şifre</label>
          <input name="password" type="password" required className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        </div>
        <Button type="submit" className="w-full">Giriş</Button>
      </form>
      <form action={magicLink} className="space-y-2">
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">E‑posta ile tek kullanımlık giriş linki</label>
          <input name="email" type="email" placeholder="ornek@mail.com" className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        </div>
        <Button type="submit" variant="ghost" className="w-full">Magic Link Gönder</Button>
      </form>
      <div className="text-sm text-green-300/80">
        Hesabın yok mu? <Link className="underline" href="/signup">Kayıt Ol</Link>
      </div>
    </div>
  );
}


