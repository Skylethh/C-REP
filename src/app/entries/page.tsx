import Link from 'next/link';
import { createClient } from '@/lib/server';
import { formatCo2eTons } from '@/lib/units';
import { ArrowLeft, Filter, Eye, Trash2 } from 'lucide-react';
import { deleteEntryAction } from './actions';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';

export default async function EntriesListPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) || {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="space-y-2">
        <p>Devam etmek için giriş yapın.</p>
        <Link href="/login" className="underline">Giriş</Link>
      </div>
    );
  }

  const type = typeof sp.type === 'string' ? sp.type : '';
  const activity = typeof sp.activity === 'string' ? sp.activity : '';
  const category = typeof sp.category === 'string' ? sp.category : '';
  const start = typeof sp.start === 'string' ? sp.start : '';
  const end = typeof sp.end === 'string' ? sp.end : '';
  const project = typeof sp.project === 'string' ? sp.project : '';
  const page = Math.max(Number(sp.page || 1), 1);
  const limit = Math.min(Number(sp.limit || 50), 200) || 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = supabase
    .from('entries')
    .select('id, project_id, date, type, category, amount, unit, co2e_value, co2e_unit, created_by, projects(name), activities(name, key)')
    .order('created_at', { ascending: false })
    .order('date', { ascending: false })
    .range(from, to);
  if (type) q = q.eq('type', type);
  if (activity) q = (q as any).ilike('activities.name', `%${activity}%`);
  if (category) q = q.ilike('category', `%${category}%`);
  if (start) q = q.gte('date', start);
  if (end) q = q.lte('date', end);
  if (project) q = q.eq('project_id', project);

  const { data, error } = await q as any;
  if (error) {
    return <div>Kayıtlar yüklenemedi: {String(error.message || error)}</div>;
  }

  // Build project -> (user_id -> {email, role}) map to show who created the entry
  const projectIds: string[] = Array.from(new Set((data || []).map((e: any) => String(e.project_id)).filter(Boolean)));
  const membersByProject = new Map<string, Map<string, { email: string; role: string }>>();
  await Promise.all(projectIds.map(async (pid: string) => {
    const { data: members } = await supabase.rpc('get_project_members', { p_project: pid });
    const m = new Map<string, { email: string; role: string }>();
    (members || []).forEach((row: any) => m.set(row.user_id, { email: row.email, role: row.role }));
    membersByProject.set(pid, m);
  }));

  const formatRole = (r?: string) => r === 'owner' ? 'sahip' : r === 'editor' ? 'editör' : r === 'viewer' ? 'görüntüleyici' : (r || '');
  const emailToName = (email?: string) => (email || '').split('@')[0] || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={"/dashboard" as any}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white transition-colors"
            aria-label="Geri"
          >
            <ArrowLeft size={16} />
            <span>Geri</span>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold leading-none">Aktiviteler</h1>
            <p className="text-white/70 text-sm mt-1">Aktivite listesini filtrele</p>
          </div>
        </div>
      </div>

      <form className="bg-white/5 border border-white/10 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-3 text-white/70 text-sm">
          <Filter size={16} className="text-leaf-400" />
          <span>Filtreler</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="flex flex-col">
            <label className="text-xs text-white/60">Aktivite</label>
            <input name="activity" defaultValue={activity} placeholder="örn. C30" className="form-input py-2" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-white/60">Tür</label>
            <select name="type" defaultValue={type} className="form-input py-2">
              <option value="">Hepsi</option>
              <option value="energy">Enerji</option>
              <option value="transport">Ulaşım</option>
              <option value="materials">Malzeme</option>
              <option value="other">Diğer</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-white/60">Kategori</label>
            <input name="category" defaultValue={category} placeholder="örn. elektrik" className="form-input py-2" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-white/60">Başlangıç</label>
            <input type="date" name="start" defaultValue={start} className="form-input py-2" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-white/60">Bitiş</label>
            <input type="date" name="end" defaultValue={end} className="form-input py-2" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-white/60">Proje</label>
            <input name="project" defaultValue={project} placeholder="ID" className="form-input py-2" />
          </div>
          <div className="sm:col-span-2 lg:col-span-6 flex items-center justify-end gap-2">
            <button className="btn-primary flex items-center gap-2 px-4 py-2 rounded-md">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"></polyline>
              </svg>
              Uygula
            </button>
            <Link href="/entries" className="px-4 py-2 rounded-md bg-white/10 border border-white/10 hover:bg-white/15 transition-colors">Temizle</Link>
          </div>
        </div>
      </form>

      <div className="rounded-md border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left p-2">Tarih</th>
              <th className="text-left p-2">Proje</th>
              <th className="text-left p-2">Aktivite</th>
              <th className="text-left p-2">Tür</th>
              <th className="text-left p-2">Miktar</th>
              <th className="text-left p-2">CO₂e</th>
              <th className="text-left p-2">Ekleyen</th>
              <th className="text-right p-2 w-0">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((e: any) => (
              <tr key={e.id} className="border-t border-white/10 hover:bg-white/5">
                <td className="p-2 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                <td className="p-2">
                  {e.project_id ? (
                    <Link 
                      className="text-leaf-400 hover:text-leaf-300 underline-offset-2 hover:underline"
                      href={`/projects/${e.project_id}`}
                    >
                      {(e.projects as any)?.name || e.project_id}
                    </Link>
                  ) : (
                    (e.projects as any)?.name || '—'
                  )}
                </td>
                <td className="p-2">{(e as any).activities?.name || e.category || '—'}</td>
                <td className="p-2">{e.type}</td>
                <td className="p-2">{e.amount} {e.unit}</td>
                <td className="p-2">{(() => { const v = Number(e.co2e_value ?? 0); if (!isFinite(v) || v<=0) return '-'; const f = formatCo2eTons(v, 3); return `${f.value} ${f.unit}`; })()}</td>
                <td className="p-2 whitespace-nowrap">{(() => { const m = membersByProject.get(e.project_id) || new Map(); const info = m.get(e.created_by) || null; if (!info) return '—'; return `${formatRole(info.role)}: ${emailToName(info.email)}`; })()}</td>
                <td className="p-2">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/entries/${e.id}` as any}
                      className="px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                      title="Görüntüle"
                    >
                      <Eye size={14} />
                    </Link>
                    <form action={deleteEntryAction}>
                      <input type="hidden" name="entryId" value={e.id} />
                      <ConfirmSubmitButton 
                        className="px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors"
                        message="Bu aktiviteyi silmek istediğinize emin misiniz?"
                      >
                        <Trash2 size={14} />
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


