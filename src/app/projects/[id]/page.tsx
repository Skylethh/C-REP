import { createClient } from '@/lib/server';
import { EvidenceUploader } from '@/components/EvidenceUploader';
import Link from 'next/link';
import { EvidenceList } from '@/components/EvidenceList';

export default async function ProjectDetail({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | string[] | undefined> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Yetkisiz</div>;

  const limit = Number(searchParams?.limit ?? 10);
  const page = Number(searchParams?.page ?? 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const start = String(searchParams?.start || '');
  const end = String(searchParams?.end || '');

  const entriesQuery = supabase
    .from('entries')
    .select('id, type, amount, unit, date, co2e_value, co2e_unit', { count: 'exact' })
    .eq('project_id', params.id)
    .order('date', { ascending: false })
    .range(from, to);
  if (start) entriesQuery.gte('date', start);
  if (end) entriesQuery.lte('date', end);

  const totalsQuery = supabase
    .from('entries')
    .select('co2e_value')
    .eq('project_id', params.id);
  if (start) totalsQuery.gte('date', start);
  if (end) totalsQuery.lte('date', end);

  const [{ data: project }, { data: entries, count }, { data: evidence }, { data: totals }] = await Promise.all([
    supabase.from('projects').select('id, name, description').eq('id', params.id).maybeSingle(),
    entriesQuery,
    supabase.from('evidence_files').select('id, file_path, mime, size, created_at', { count: 'exact' }).eq('project_id', params.id).order('created_at', { ascending: false }).range(from, to),
    totalsQuery
  ]);

  if (!project) return <div>Proje bulunamadı</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-green-300/80">{project.description}</p>
        </div>
        <Link className="underline" href={`/projects/${project.id}/export`}>CSV Dışa Aktar</Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Kayıtlar</h2>
        <form className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-green-300/80">Başlangıç</label>
            <input name="start" type="date" defaultValue={start} className="rounded-md bg-emerald-900 border border-white/10 px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs text-green-300/80">Bitiş</label>
            <input name="end" type="date" defaultValue={end} className="rounded-md bg-emerald-900 border border-white/10 px-2 py-1" />
          </div>
          <button className="text-sm underline">Filtrele</button>
          <div className="ml-auto text-sm text-green-300/80">Toplam CO2e: <span className="text-green-200">{(totals?.reduce((s, r) => s + (Number(r.co2e_value) || 0), 0) || 0).toFixed(3)} kg</span></div>
        </form>
        <ul className="space-y-2">
          {entries?.map((e) => (
            <li key={e.id} className="rounded-md border border-white/10 p-3 bg-white/5">
              <div className="flex items-center justify-between">
                <span>{e.type} — {e.amount} {e.unit} ({e.date})</span>
                <span className="text-green-300/80">{e.co2e_value ?? '-'} {e.co2e_unit ?? 'kg'}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          {page > 1 ? <Link className="underline" href={`/projects/${project.id}?page=${page-1}&limit=${limit}`}>Önceki</Link> : null}
          {(count ?? 0) > page*limit ? <Link className="underline" href={`/projects/${project.id}?page=${page+1}&limit=${limit}`}>Sonraki</Link> : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Kanıtlar</h2>
        <EvidenceUploader projectId={project.id} />
        {evidence ? <EvidenceList items={evidence as any} /> : null}
      </section>
    </div>
  );
}


