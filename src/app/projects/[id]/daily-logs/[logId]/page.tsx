import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import { DailyLogPhotoUploader } from '@/components/DailyLogPhotoUploader';
import { DailyLogPhotoGrid } from '@/components/DailyLogPhotoGrid';
import { DailyLogMaterialForm } from '@/components/DailyLogMaterialForm';

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

  const [manpowerRes, equipmentRes, materialsRes] = await Promise.all([
    supabase.from('daily_log_manpower').select('*').eq('log_id', logId).order('created_at', { ascending: false }),
    supabase.from('daily_log_equipment').select('*').eq('log_id', logId).order('created_at', { ascending: false }),
    supabase
      .from('daily_log_materials')
      .select('*, activities(name, default_unit, units)')
      .eq('log_id', logId)
      .order('created_at', { ascending: false })
  ]);

  const manpower = manpowerRes.data || [];
  const equipment = equipmentRes.data || [];
  const materials = materialsRes.data || [];

  async function setWeather(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const weather = String(formData.get('weather') || '');
    const { error } = await supabase.from('daily_logs').update({ weather }).eq('id', logId);
    if (error) redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs/${logId}` as unknown) as Route);
  }

  // Optional: placeholder server action to set suggested weather value
  async function setSuggestedWeather() {
    'use server';
    const supabase = await createClient();
    // Placeholder suggestion logic. Later, fetch real data using project location.
    const suggestion = 'Güneşli';
    const { error } = await supabase.from('daily_logs').update({ weather: suggestion }).eq('id', logId);
    if (error) redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs/${logId}` as unknown) as Route);
  }

  async function saveSummary(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const work_summary = String(formData.get('work_summary') || '');
    const { error } = await supabase.from('daily_logs').update({ work_summary }).eq('id', logId);
    if (error) redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs/${logId}` as unknown) as Route);
  }

  async function addManpower(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const contractor = String(formData.get('contractor') || '');
    const trade = String(formData.get('trade') || '');
    const person_count = Number(formData.get('person_count') || 0);
    const { error } = await supabase.from('daily_log_manpower').insert({ log_id: logId, contractor, trade, person_count });
    if (error) redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs/${logId}` as unknown) as Route);
  }

  async function deleteManpower(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const idToDelete = String(formData.get('id'));
    const { error } = await supabase.from('daily_log_manpower').delete().eq('id', idToDelete);
    if (error) redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs/${logId}` as unknown) as Route);
  }

  async function addEquipment(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const equipment_name = String(formData.get('equipment_name') || '');
    const hours = Number(formData.get('hours') || 0);
    const { error } = await supabase.from('daily_log_equipment').insert({ log_id: logId, equipment_name, hours });
    if (error) redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs/${logId}` as unknown) as Route);
  }

  async function deleteEquipment(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const idToDelete = String(formData.get('id'));
    const { error } = await supabase.from('daily_log_equipment').delete().eq('id', idToDelete);
    if (error) redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs/${logId}` as unknown) as Route);
  }

  async function addMaterial(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const activity_id = String(formData.get('activity_id') || '');
    const quantity = Number(formData.get('quantity') || 0);
    const unit = String(formData.get('unit') || '');
    // Server-side unit validation against the activity's allowed units
    const { data: act, error: actErr } = await supabase
      .from('activities')
      .select('id, default_unit, units')
      .eq('id', activity_id)
      .maybeSingle();
    if (actErr || !act) {
      redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent(actErr?.message || 'activity not found')}` as unknown) as Route);
    }
    const allowedUnits: string[] = Array.from(new Set([act.default_unit, ...((Array.isArray(act.units) ? act.units : []) as string[])]));
    if (!allowedUnits.includes(unit)) {
      redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent('Seçilen birim bu faaliyet için geçerli değil')}` as unknown) as Route);
    }
    const { error } = await supabase.from('daily_log_materials').insert({ log_id: logId, activity_id, quantity, unit });
    if (error) redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs/${logId}` as unknown) as Route);
  }

  async function deleteMaterial(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const idToDelete = String(formData.get('id'));
    const { error } = await supabase.from('daily_log_materials').delete().eq('id', idToDelete);
    if (error) redirect((`/projects/${id}/daily-logs/${logId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/daily-logs/${logId}` as unknown) as Route);
  }

  // Fetch activities for material select
  const { data: activities } = await supabase.from('activities').select('id, name, default_unit, units').order('name');

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{new Date(log.date).toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' })} Günlüğü</h1>
          <div className="text-white/70 text-sm">Proje #{id}</div>
        </div>
        <Link href={( `/projects/${id}/daily-logs` as unknown) as Route} className="px-3 py-1.5 rounded border border-white/10 bg-white/10">← Listeye Dön</Link>
      </div>

      {/* Weather - simplified quick set */}
      <div className="glass rounded border border-white/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Hava Durumu</div>
          <div className="text-xs text-white/60">Şu an: {log.weather || '-'}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Güneşli','Parçalı Bulutlu','Bulutlu','Yağmurlu','Kar'].map((w) => (
            <form key={w} action={setWeather}>
              <input type="hidden" name="weather" value={w} />
              <button className="px-3 py-1.5 rounded border border-white/10 bg-white/10 hover:bg-white/20">{w}</button>
            </form>
          ))}
          <form action={setSuggestedWeather}>
            <button className="px-3 py-1.5 rounded border border-emerald-500/20 text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20">
              Öner (Beta)
            </button>
          </form>
        </div>
      </div>

      {/* Work Summary */}
      <div className="glass rounded border border-white/10 p-4">
        <div className="font-medium mb-2">Yapılan İşler (Özet)</div>
        <form action={saveSummary} className="space-y-2">
          <textarea name="work_summary" defaultValue={log.work_summary ?? ''} className="form-input min-h-[140px]" placeholder="• A Blok 2. kat kolon kalıpları çakıldı.
• ..." />
          <button type="submit" className="btn-primary">Kaydet</button>
        </form>
      </div>

      {/* Manpower */}
  <details className="glass rounded border border-white/10 p-4">
        <summary className="cursor-pointer font-medium mb-2">İş Gücü</summary>
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">İş Gücü</div>
        </div>
        <div className="space-y-2 mb-4">
          {manpower.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-sm">{m.contractor || 'Taşeron'} • {m.trade || 'Meslek'} • {m.person_count} kişi</div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-white/60">{new Date(m.created_at).toLocaleTimeString()}</div>
                <form action={deleteManpower}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="text-red-300 hover:text-red-200 text-xs border border-red-400/30 rounded px-2 py-0.5">Sil</button>
                </form>
              </div>
            </div>
          ))}
          {manpower.length === 0 && <div className="text-white/60 text-sm">Henüz iş gücü eklenmedi.</div>}
        </div>
        <form action={addManpower} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="text" name="contractor" placeholder="Taşeron Firma" className="form-input" />
          <input type="text" name="trade" placeholder="Meslek (Kalıpçı, Demirci)" className="form-input" />
          <input type="number" min={0} name="person_count" placeholder="Kişi Sayısı" className="form-input" />
          <button type="submit" className="btn-primary">+ Ekle</button>
        </form>
      </details>

      {/* Equipment */}
      <details className="glass rounded border border-white/10 p-4">
        <summary className="cursor-pointer font-medium mb-2">Sahadaki Ekipmanlar</summary>
        <div className="space-y-2 mb-4">
          {equipment.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-sm">{e.equipment_name} • {e.hours} saat</div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-white/60">{new Date(e.created_at).toLocaleTimeString()}</div>
                <form action={deleteEquipment}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-red-300 hover:text-red-200 text-xs border border-red-400/30 rounded px-2 py-0.5">Sil</button>
                </form>
              </div>
            </div>
          ))}
          {equipment.length === 0 && <div className="text-white/60 text-sm">Henüz ekipman eklenmedi.</div>}
        </div>
        <form action={addEquipment} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" name="equipment_name" placeholder="Ekipman Adı" className="form-input" />
          <input type="number" min={0} step="0.1" name="hours" placeholder="Çalışma Saati" className="form-input" />
          <button type="submit" className="btn-primary">+ Ekle</button>
        </form>
      </details>

      {/* Materials */}
      <details className="glass rounded border border-white/10 p-4">
        <summary className="cursor-pointer font-medium mb-2">Gelen Malzemeler</summary>
        <div className="space-y-2 mb-4">
          {materials.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-sm">{m.activities?.name || 'Malzeme'} • {m.quantity} {m.unit}</div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-white/60">{new Date(m.created_at).toLocaleTimeString()}</div>
                <form action={deleteMaterial}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="text-red-300 hover:text-red-200 text-xs border border-red-400/30 rounded px-2 py-0.5">Sil</button>
                </form>
              </div>
            </div>
          ))}
          {materials.length === 0 && <div className="text-white/60 text-sm">Henüz malzeme eklenmedi.</div>}
        </div>
        <DailyLogMaterialForm activities={(activities as any) || []} action={addMaterial} />
      </details>

      {/* Photos */}
      <details className="glass rounded border border-white/10 p-4">
        <summary className="cursor-pointer font-medium mb-3">Fotoğraflar</summary>
        <div className="mb-3">
          <DailyLogPhotoUploader projectId={id} logId={logId} />
        </div>
        <DailyLogPhotoGrid projectId={id} logId={logId} keys={Array.isArray(log.photos) ? log.photos : []} />
      </details>
    </div>
  );
}
