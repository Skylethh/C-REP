import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';

export default async function NewDailyLogPage({ params, searchParams }: { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
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
      <div className="max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-leaf-500 to-ocean-500 flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Yeni Günlük</h1>
              <p className="text-white/60 text-sm">Projeniz için günlük rapor oluşturun</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {!canEdit && (
          <div className="glass-card border-amber-400/20 bg-amber-500/5 p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <path d="M12 9v4"/>
                  <path d="m12 17 .01 0"/>
                </svg>
              </div>
              <div className="text-amber-200/90 text-sm">
                Bu projede günlük oluşturma izniniz yok (rolünüz: {membership?.role || 'bilinmiyor'}). Lütfen proje sahibi/editör'den yetki isteyin.
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="glass-card border-red-400/20 bg-red-500/5 p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-400/20 flex items-center justify-center mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m15 9-6 6"/>
                  <path d="m9 9 6 6"/>
                </svg>
              </div>
              <div className="text-red-200/90 text-sm">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="glass-card p-8">
          <form action={create} className="space-y-8">
            {/* Date Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white font-medium text-sm">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-leaf-400/20 to-ocean-400/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-leaf-400">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                    <line x1="16" x2="16" y1="2" y2="6"/>
                    <line x1="8" x2="8" y1="2" y2="6"/>
                    <line x1="3" x2="21" y1="10" y2="10"/>
                  </svg>
                </div>
                Tarih
              </label>
              <input 
                type="date" 
                name="date" 
                required 
                className="form-input w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-leaf-400/30 focus:border-leaf-400/30 transition-all" 
                defaultValue={defaultDate} 
              />
            </div>

            {/* Weather Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white font-medium text-sm">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-leaf-400/20 to-ocean-400/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ocean-400">
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
                  </svg>
                </div>
                Hava Durumu
              </label>
              <input 
                type="text" 
                name="weather" 
                placeholder="Güneşli, yağmurlu, karlı..." 
                className="form-input w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-ocean-400/30 focus:border-ocean-400/30 transition-all" 
              />
            </div>

            {/* Notes Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white font-medium text-sm">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-leaf-400/20 to-ocean-400/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-leaf-400">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" x2="8" y1="13" y2="13"/>
                    <line x1="16" x2="8" y1="17" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </div>
                Notlar
              </label>
              <textarea 
                name="notes" 
                placeholder="Bugünkü çalışmalar, gözlemler ve notlarınızı buraya yazın..."
                className="form-input w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-leaf-400/30 focus:border-leaf-400/30 transition-all min-h-[140px] resize-y" 
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button 
                type="submit" 
                className="btn-primary w-full justify-center text-base font-semibold py-4 disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={!canEdit}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                Günlüğü Kaydet
              </button>
            </div>
          </form>
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <Link 
            href={`/projects/${id}/daily-logs`}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Günlüklere Geri Dön
          </Link>
        </div>
      </div>
    </div>
  );
}