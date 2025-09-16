import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';

export default async function NewDailyLogPage({ params }: { params: { id: string } }) {
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
    const { error } = await supabase.from('daily_logs').insert({ project_id: id, date, weather, notes, created_by: user!.id });
    if (error) redirect((`/projects/${id}/daily-logs/new?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs` as unknown) as Route);
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-semibold mb-4">Yeni Günlük</h1>
      <form action={create} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm mb-1">Tarih</label>
          <input type="date" name="date" required className="form-input" />
        </div>
        <div>
          <label className="block text-sm mb-1">Hava Durumu</label>
          <input type="text" name="weather" placeholder="Güneşli, yağmurlu..." className="form-input" />
        </div>
        <div>
          <label className="block text-sm mb-1">Notlar</label>
          <textarea name="notes" className="form-input min-h-[120px]" />
        </div>
        <button type="submit" className="btn-primary">Kaydet</button>
      </form>
    </div>
  );
}
