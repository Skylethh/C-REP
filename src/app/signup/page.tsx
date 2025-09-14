import { signup } from '@/app/auth/actions';
import { Button } from '@/components/button';
import Link from 'next/link';

export default function SignupPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Kayıt Ol</h1>
      {searchParams?.error ? (
        <div className="rounded-md border border-red-400/30 bg-red-950/30 text-red-200 px-3 py-2 text-sm">
          {String(searchParams.error)}
        </div>
      ) : null}
      <form action={signup} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">E-posta</label>
          <input name="email" type="email" required className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">Şifre</label>
          <input name="password" type="password" required className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        </div>
        <Button type="submit" className="w-full">Kayıt Ol</Button>
      </form>
      <div className="text-sm text-green-300/80">
        Zaten hesabın var mı? <Link className="underline" href="/login">Giriş Yap</Link>
      </div>
    </div>
  );
}


