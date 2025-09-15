import Link from 'next/link';
import { createClient } from '@/lib/server';

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
    .select('id, project_id, date, type, category, amount, unit, co2e_value, co2e_unit, projects(name)')
    .order('date', { ascending: false })
    .range(from, to);
  if (type) q = q.eq('type', type);
  if (category) q = q.ilike('category', `%${category}%`);
  if (start) q = q.gte('date', start);
  if (end) q = q.lte('date', end);
  if (project) q = q.eq('project_id', project);

  const { data, error } = await q as any;
  if (error) {
    return <div>Kayıtlar yüklenemedi: {String(error.message || error)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kayıtlar</h1>
          <p className="text-white/70 text-sm">Filtreli görünüm</p>
        </div>
      </div>

      <form className="flex flex-wrap gap-2 items-end bg-white/5 border border-white/10 p-3 rounded-md">
        <div className="flex flex-col">
          <label className="text-xs text-white/60">Tür</label>
          <select name="type" defaultValue={type} className="form-input py-1.5">
            <option value="">Hepsi</option>
            <option value="energy">Enerji</option>
            <option value="transport">Ulaşım</option>
            <option value="materials">Malzeme</option>
            <option value="other">Diğer</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-white/60">Kategori</label>
          <input name="category" defaultValue={category} placeholder="örn. elektrik" className="form-input py-1.5" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-white/60">Başlangıç</label>
          <input type="date" name="start" defaultValue={start} className="form-input py-1.5" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-white/60">Bitiş</label>
          <input type="date" name="end" defaultValue={end} className="form-input py-1.5" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-white/60">Proje ID</label>
          <input name="project" defaultValue={project} className="form-input py-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-md bg-gradient-to-r from-leaf-600 to-ocean-600 text-white">Uygula</button>
          <Link href="/entries" className="px-3 py-1.5 rounded-md bg-white/10 border border-white/10">Temizle</Link>
        </div>
      </form>

      <div className="rounded-md border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left p-2">Tarih</th>
              <th className="text-left p-2">Proje</th>
              <th className="text-left p-2">Tür</th>
              <th className="text-left p-2">Kategori</th>
              <th className="text-left p-2">Miktar</th>
              <th className="text-left p-2">CO₂e</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((e: any) => (
              <tr key={e.id} className="border-t border-white/10 hover:bg-white/5">
                <td className="p-2 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                <td className="p-2">{(e.projects as any)?.name || e.project_id}</td>
                <td className="p-2">{e.type}</td>
                <td className="p-2">{e.category || '—'}</td>
                <td className="p-2">{e.amount} {e.unit}</td>
                <td className="p-2">{e.co2e_value ?? '-'} {e.co2e_unit ?? 'kg'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


