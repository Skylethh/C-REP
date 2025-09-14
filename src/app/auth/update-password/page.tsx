import { updatePassword } from '@/app/auth/server';
import { Button } from '@/components/button';

export default function UpdatePasswordPage() {
  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Yeni Şifre</h1>
      <form action={updatePassword} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-green-300/80">Yeni Şifre</label>
          <input name="password" type="password" required className="w-full rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        </div>
        <Button type="submit" className="w-full">Güncelle</Button>
      </form>
    </div>
  );
}


