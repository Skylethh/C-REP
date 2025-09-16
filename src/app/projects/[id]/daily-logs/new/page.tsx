import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';

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
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-semibold mb-4">Yeni Günlük</h1>
      {!canEdit && (
        <div className="mb-4 text-sm text-amber-300/90">
          Bu projede günlük oluşturma izniniz yok (rolünüz: {membership?.role || 'bilinmiyor'}). Lütfen proje sahibi/edi̇tör’den yetki isteyin.
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 text-sm text-red-300">{errorMsg}</div>
      )}
      <form action={create} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm mb-1">Tarih</label>
          <input type="date" name="date" required className="form-input" defaultValue={defaultDate} />
        </div>
        <div>
          <label className="block text-sm mb-1">Hava Durumu</label>
          <input type="text" name="weather" placeholder="Güneşli, yağmurlu..." className="form-input" />
        </div>
        <div>
          <label className="block text-sm mb-1">Notlar</label>
          <textarea name="notes" className="form-input min-h-[120px]" />
        </div>
        <button type="submit" className="btn-primary" disabled={!canEdit}>Kaydet</button>
      </form>
    </div>
  );
}
