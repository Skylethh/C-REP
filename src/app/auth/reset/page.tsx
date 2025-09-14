import { requestPasswordReset } from '@/app/auth/server';
import { Button } from '@/components/button';

export default function ResetPasswordRequestPage() {
  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Şifre Sıfırlama</h1>
      <form action={requestPasswordReset} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">E‑posta</label>
          <input name="email" type="email" required className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        </div>
        <Button type="submit" className="w-full">Sıfırlama Linki Gönder</Button>
      </form>
    </div>
  );
}


