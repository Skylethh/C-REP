import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';

export default async function DailyLogDetailPage({ params }: { params: { id: string; logId: string } }) {
  const { id, logId } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?error=login_required` as unknown) as Route);

  const { data: log, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('project_id', id)
    .eq('id', logId)
    .maybeSingle();
  if (error) return <div>Günlük yüklenemedi: {error.message}</div>;
  if (!log) return <div>Günlük bulunamadı</div>;

  const { data: entries } = await supabase
    .from('daily_log_entries')
    .select('*')
    .eq('log_id', logId)
    .order('created_at', { ascending: false });

  async function addEntry(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const crew_count = Number(formData.get('crew_count') || 0);
    const work_done = String(formData.get('work_done') || '');
    const equipment_used_raw = String(formData.get('equipment_used') || '');
    const location = String(formData.get('location') || '');
    const equipment_used = equipment_used_raw ? equipment_used_raw.split(',').map(s => s.trim()) : [];
    const { error } = await supabase
      .from('daily_log_entries')
      .insert({ log_id: logId, crew_count, work_done, equipment_used, location });
    if (error) redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs/${logId}` as unknown) as Route);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Günlük Detayı</h1>
        <div className="text-white/70 text-sm">Tarih: {new Date(log.date).toLocaleDateString()} • Hava: {log.weather || '-'}</div>
        {log.notes && <div className="text-white/70 text-sm">Notlar: {log.notes}</div>}
      </div>

      <div className="space-y-2">
        {(entries || []).map((e: any) => (
          <div key={e.id} className="glass rounded border border-white/10 p-4">
            <div className="text-sm text-white/70">{new Date(e.created_at).toLocaleString()}</div>
            <div className="font-medium">Ekip: {e.crew_count || 0}</div>
            <div>İş: {e.work_done || '-'}</div>
            <div>Lokasyon: {e.location || '-'}</div>
            <div>Ekipman: {(e.equipment_used || []).join(', ')}</div>
          </div>
        ))}
        {(!entries || entries.length === 0) && (
          <div className="text-white/60">Henüz giriş yok.</div>
        )}
      </div>

      <form action={addEntry} className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm mb-1">Ekip Sayısı</label>
          <input type="number" name="crew_count" min={0} defaultValue={0} className="form-input" />
        </div>
        <div>
          <label className="block text-sm mb-1">Yapılan İş</label>
          <textarea name="work_done" className="form-input min-h-[120px]" />
        </div>
        <div>
          <label className="block text-sm mb-1">Ekipman (virgülle ayır)</label>
          <input type="text" name="equipment_used" placeholder="vinç, iskele..." className="form-input" />
        </div>
        <div>
          <label className="block text-sm mb-1">Lokasyon</label>
          <input type="text" name="location" className="form-input" />
        </div>
        <button type="submit" className="btn-primary">Giriş Ekle</button>
      </form>
    </div>
  );
}
