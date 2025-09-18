import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';

export default async function NewDailyLogPage({ params, searchParams }: any) {
  const { id } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?error=login_required` as unknown) as Route);

  async function create(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const date = String(formData.get('date'));
    const weather = String(formData.get('weather') || '');
    const notes = String(formData.get('notes') || '');
    const { data, error } = await supabase
      .from('daily_logs')
      .insert({ project_id: id, date, weather, notes, created_by: user!.id })
      .select('id')
      .single();
    if (error || !data?.id) redirect((`/projects/${id}/daily-logs/new?error=${encodeURIComponent(error?.message || 'create_failed')}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs/${data.id}` as unknown) as Route);
  }

  // Check membership role to ensure user can create (owner/editor)
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  const canEdit = membership?.role === 'owner' || membership?.role === 'editor';

  const defaultDate = typeof searchParams?.date === 'string' ? searchParams?.date : undefined;
  const errorMsg = typeof searchParams?.error === 'string' ? searchParams?.error : undefined;

  // If a date is provided, auto find-or-create and redirect to detail (so structured cards show immediately)
  if (defaultDate && canEdit) {
    // 1) Try find an existing log for that date
    const { data: existing } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('project_id', id)
      .eq('date', defaultDate)
      .maybeSingle();
    if (existing?.id) {
      redirect((`/projects/${id}/daily-logs/${existing.id}` as unknown) as Route);
    }
    // 2) Create one and redirect
    const ins = await supabase
      .from('daily_logs')
      .insert({ project_id: id, date: defaultDate, created_by: user.id })
      .select('id')
      .single();
    if (ins.data?.id) {
      redirect((`/projects/${id}/daily-logs/${ins.data.id}` as unknown) as Route);
    }
    if (ins.error) {
      redirect((`/projects/${id}/daily-logs/new?date=${encodeURIComponent(defaultDate)}&error=${encodeURIComponent(ins.error.message)}` as unknown) as Route);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-leaf-500 to-ocean-500 flex items-center justify-center shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Yeni Günlük</h1>
              <p className="text-white/70">Proje #{id} için günlük kaydı oluşturun</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {!canEdit && (
          <div className="glass p-4 border border-amber-300/30">
            <div className="text-sm text-amber-300/90">
              Bu projede günlük oluşturma izniniz yok (rolünüz: {membership?.role || 'bilinmiyor'}). Lütfen proje sahibi/edi̇tör’den yetki isteyin.
            </div>
          </div>
        )}
        {errorMsg && (
          <div className="glass p-4 border border-red-400/30 text-sm text-red-300">{errorMsg}</div>
        )}

        {/* Form */}
        <div className="glass-card">
          <form action={create} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="form-label flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Tarih <span className="text-red-400">*</span>
                </label>
                <input type="date" name="date" required className="form-input" defaultValue={defaultDate} />
              </div>

              <div className="space-y-1">
                <label className="form-label flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3" />
                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                  </svg>
                  Hava Durumu
                </label>
                <input type="text" name="weather" placeholder="Güneşli, yağmurlu..." className="form-input" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="form-label flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                </svg>
                Notlar
              </label>
              <textarea name="notes" className="form-input min-h-[140px]" placeholder="Şantiye ilerlemesi, sorunlar, kaynak kullanımı..." />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button type="submit" className="btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2" disabled={!canEdit}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                Günlüğü Kaydet
              </button>
              <Link href={`/projects/${id}/daily-logs` as Route} className="btn-secondary px-4 py-2 rounded-lg">
                Vazgeç
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
