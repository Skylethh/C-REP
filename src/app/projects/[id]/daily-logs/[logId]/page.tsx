import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import { WeatherQuickSet } from '@/components/WeatherQuickSet';
import { DailyLogPhotoUploader } from '@/components/DailyLogPhotoUploader';
import { DailyLogPhotoList } from '@/components/DailyLogPhotoList';
import { DailyLogManpowerSection } from '@/components/DailyLogManpowerSection';
import { DailyLogEquipmentSection } from '@/components/DailyLogEquipmentSection';
import { DailyLogMaterialsSection } from '@/components/DailyLogMaterialsSection';

export default async function DailyLogDetailPage({ params }: any) {
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

  // Fetch project information
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', id)
    .maybeSingle();

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
    if (error) throw new Error(error.message);
    // no redirect; client will update state
  }

  // Optional: placeholder server action to set suggested weather value
  async function setSuggestedWeather() {
    'use server';
    const supabase = await createClient();
    // Placeholder suggestion logic. Later, fetch real data using project location.
    const suggestion = 'Güneşli';
    const { error } = await supabase.from('daily_logs').update({ weather: suggestion }).eq('id', logId);
    if (error) throw new Error(error.message);
    // return value so client can reflect it immediately
    return { weather: suggestion } as any;
  }

  async function saveSummary(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const work_summary = String(formData.get('work_summary') || '');
    const { error } = await supabase.from('daily_logs').update({ work_summary }).eq('id', logId);
    if (error) redirect((`/projects/${id}/daily-logs?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    // Ensure calendar list and detail page are fresh
    revalidatePath((`/projects/${id}/daily-logs` as unknown) as Route);
    revalidatePath((`/projects/${id}/daily-logs/${logId}` as unknown) as Route);
    // Go back to calendar view after saving
    redirect((`/projects/${id}/daily-logs` as unknown) as Route);
  }

  // Remove heavy redirect-based forms for manpower/equipment/materials; use client sections for instant UX

  // Fetch activities for material select
  const { data: activities } = await supabase.from('activities').select('id, name, default_unit, units').order('name');

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{new Date(log.date).toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' })} Günlüğü</h1>
          <div className="text-white/70 text-sm">{project?.name || 'Proje'}</div>
        </div>
        <Link href={( `/projects/${id}/daily-logs` as unknown) as Route} className="px-3 py-1.5 rounded border border-white/10 bg-white/10">← Listeye Dön</Link>
      </div>

      {/* Weather - quick set without full page reload */}
      <WeatherQuickSet current={log.weather} onSet={setWeather} onSuggest={setSuggestedWeather} />

      {/* Work Summary */}
      <div className="glass rounded border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div>
            <div className="font-medium text-lg">Yapılan İşler (Özet)</div>
            <div className="text-white/60 text-sm">Günün gerçekleştirilen aktivitelerini detaylandırın</div>
          </div>
        </div>
        
        <form id="summary-form" action={saveSummary} className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <textarea 
              name="work_summary" 
              defaultValue={log.work_summary ?? ''} 
              className="w-full min-h-[160px] bg-transparent border-none resize-none focus:outline-none text-white placeholder-white/40 text-sm leading-relaxed" 
              placeholder="Örnek format:
• A Blok 2. kat kolon kalıpları çakıldı
• Beton dökümü tamamlandı (150 m³)
• Demir donatı yerleştirme işlemleri başladı
• Kalıp temizlik çalışmaları yapıldı
• Malzeme sevkiyatı gerçekleştirildi"
            />
          </div>
          <div className="flex items-center justify-end">
            <div className="text-xs text-white/40">
              Son güncelleme: {log.updated_at ? new Date(log.updated_at).toLocaleString('tr-TR') : 'Henüz kaydedilmedi'}
            </div>
          </div>
        </form>
      </div>
      

      {/* Manpower */}
      <DailyLogManpowerSection logId={logId} initial={manpower as any} />

      {/* Equipment */}
      <DailyLogEquipmentSection logId={logId} initial={equipment as any} />

      {/* Materials */}
      <DailyLogMaterialsSection logId={logId} activities={(activities as any) || []} initial={materials as any} />

      {/* Photos */}
      <details className="glass rounded-lg border border-white/20 p-4 group hover:border-indigo-400/40 transition-all duration-200">
        <summary className="cursor-pointer font-medium mb-3 flex items-center gap-2 hover:text-leaf-300 transition-all duration-200 list-none">
          <div className="flex items-center gap-2 flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            Fotoğraflar
            <span className="text-xs text-white/50">Günlük fotoğraflar</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60 transition-transform duration-200 group-open:rotate-180">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </summary>
        <div className="mb-3">
          <DailyLogPhotoUploader projectId={id} logId={logId} />
        </div>
        <DailyLogPhotoList 
          projectId={id} 
          logId={logId} 
          photos={Array.isArray(log.photos) ? log.photos : []} 
        />
      </details>

      {/* Bottom single Save button (at the very end of the page) */}
      <div className="mt-6 flex items-center justify-end">
        <button
          type="submit"
          form="summary-form"
          className="btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          Günlüğü Kaydet
        </button>
      </div>
    </div>
  );
}
