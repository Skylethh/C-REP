import { createClient } from '@/lib/server';
import Link from 'next/link';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { Folder, FileText, Plus } from 'lucide-react';
import BarChart from '@/components/charts/BarChart';
import { SmartBackLink } from '@/components/SmartBackLink';

export default async function ProjectsIndexPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) || {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <p>Devam etmek için lütfen giriş yapın.</p>
        <Link className="underline" href="/login">Giriş</Link>
      </div>
    );
  }

  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const sort = typeof sp.sort === 'string' ? sp.sort : 'created_desc';
  const limit = Math.min(Number(sp.limit || 12), 48) || 12;
  const page = Math.max(Number(sp.page || 1), 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let projQuery = supabase
    .from('projects')
    .select('id, name, description, created_at', { count: 'exact' })
    .range(from, to);
  if (q) {
    projQuery = projQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (sort === 'created_asc') {
    projQuery = projQuery.order('created_at', { ascending: true });
  } else if (sort === 'name_asc') {
    projQuery = projQuery.order('name', { ascending: true });
  } else if (sort === 'name_desc') {
    projQuery = projQuery.order('name', { ascending: false });
  } else {
    projQuery = projQuery.order('created_at', { ascending: false });
  }

  const { data, count } = await projQuery;
  const total = count || 0;

  // Aggregate last 90 days emissions by project (best-effort; empty if RLS prevents)
  const supabase2 = await createClient();
  const since = new Date(); since.setDate(since.getDate() - 90);
  const sinceIso = since.toISOString().slice(0,10);
  const { data: recentByProject } = await supabase2
    .from('entries')
    .select('project_id, projects!inner(name), co2e_value')
    .gte('date', sinceIso);
  const byProjectMap = (recentByProject || []).reduce((acc: Record<string, { name: string; total: number }>, row: any) => {
    const id = String(row.project_id);
    const name = row.projects?.name || id;
    if (!acc[id]) acc[id] = { name, total: 0 };
    acc[id].total += Number(row.co2e_value || 0);
    return acc;
  }, {} as Record<string, { name: string; total: number }>);
  const barData = Object.values(byProjectMap)
    .map(p => ({ label: p.name, value: p.total }))
    .sort((a,b) => b.value - a.value)
    .slice(0, 8);

  const todayIso = new Date().toISOString().slice(0,10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SmartBackLink entriesHref={'/'} label="Geri" />
          <h1 className="text-xl font-semibold">Projelerim</h1>
        </div>
        <div className="flex items-center gap-2">
          <CreateProjectDialog />
        </div>
      </div>

      {/* Filters moved from Dashboard */}
      <form className="dashboard-filters">
        <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-md px-3 py-2 border border-white/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <input 
            name="q" 
            defaultValue={q} 
            placeholder="Proje adı veya açıklama ara..." 
            className="bg-transparent border-none outline-none w-full text-sm focus:outline-none focus:ring-0" 
          />
        </div>
        
        <div className="flex gap-2">
          <select name="sort" defaultValue={sort} className="form-input text-sm py-2">
            <option value="created_desc">En yeni</option>
            <option value="created_asc">En eski</option>
            <option value="name_asc">Ad (A→Z)</option>
            <option value="name_desc">Ad (Z→A)</option>
          </select>
          
          <select name="limit" defaultValue={String(limit)} className="form-input text-sm py-2 w-24">
            <option value="6">6 adet</option>
            <option value="12">12 adet</option>
            <option value="24">24 adet</option>
            <option value="48">48 adet</option>
          </select>
          
          <button className="btn-primary text-sm font-medium flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
            <span>Uygula</span>
          </button>
        </div>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(data || []).map(p => (
          <div key={p.id} className="data-card hover:border-leaf-400/30 hover:bg-white/10 transition-all duration-300 h-full flex flex-col group">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-gradient-to-r from-leaf-500/20 to-ocean-500/20 p-2 rounded-md">
                <Folder size={16} className="text-leaf-400" />
              </div>
              <Link href={`/projects/${p.id}`} className="font-medium text-base group-hover:text-leaf-400 transition-colors">
                {p.name}
              </Link>
            </div>
            <div className="text-white/70 text-sm mb-4 line-clamp-2 flex-grow">{p.description || '—'}</div>
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
              <div className="text-xs text-white/60">
                {new Date(p.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                <Link 
                  className="bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/15 px-2 py-1 rounded-md transition-all duration-200 flex items-center gap-1 text-leaf-400 text-xs" 
                  href={`/projects/${p.id}`}
                >
                  <FileText size={12} />
                  <span>Detay</span>
                </Link>
                <Link 
                  className="bg-gradient-to-r from-leaf-600/70 to-ocean-600/70 hover:from-leaf-500/90 hover:to-ocean-500/90 px-2 py-1 rounded-md text-white transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1 text-xs" 
                  href={`/projects/${p.id}/daily-logs/new?date=${todayIso}`}
                >
                  <Plus size={12} />
                  <span>Günlük Ekle</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Projects comparison chart */}
      {barData.length > 0 && (
        <div className="data-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white/80">Projeler Karşılaştırma (Son 90 Gün, tCO2e)</h2>
          </div>
          <BarChart data={barData} height={360} />
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-center mt-4">
          <div className="inline-flex items-center gap-2 rounded-md bg-white/5 border border-white/10 p-1">
            {page > 1 ? (
              <Link href={`?page=${page-1}&limit=${limit}&q=${encodeURIComponent(q)}&sort=${sort}`} className="p-2 rounded-md hover:bg-white/10 transition-all text-white/80 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </Link>
            ) : (
              <span className="p-2 text-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </span>
            )}
            
            <span className="px-3 py-1 text-sm font-medium text-white/80">
              {page} / {Math.ceil(total / limit)}
            </span>
            
            {page * limit < total ? (
              <Link href={`?page=${page+1}&limit=${limit}&q=${encodeURIComponent(q)}&sort=${sort}`} className="p-2 rounded-md hover:bg-white/10 transition-all text-white/80 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </Link>
            ) : (
              <span className="p-2 text-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
