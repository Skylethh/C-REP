export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">C-rep</h1>
      <p className="text-green-300/80 max-w-prose">
        Karbon emisyonlarını proje bazında takip, hesapla ve raporla. Supabase RLS ile güvenli, modern ve erişilebilir.
      </p>
      <div className="flex gap-3">
        <a href="/signup" className="inline-flex items-center rounded-md bg-green-600 px-4 py-2">Hesap Oluştur</a>
        <a href="/login" className="inline-flex items-center rounded-md border border-white/20 px-4 py-2">Giriş Yap</a>
      </div>
    </div>
  );
}


