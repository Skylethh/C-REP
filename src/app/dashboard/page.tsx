import { createClient } from '@/lib/server';
import Link from 'next/link';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { DashboardCard } from '@/components/DashboardCard';
import { StatsCard } from '@/components/StatsCard';
import { EmissionsChart } from '@/components/EmissionsChart';
import { getMessages } from '@/i18n';
import { 
  BarChart2, 
  Calendar, 
  Clock, 
  FileText, 
  Folder, 
  Plus, 
  Settings, 
  TrendingUp 
} from 'lucide-react';
import { Button } from '@/components/button';

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { dict } = await getMessages();
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
  const limit = Math.min(Number(sp.limit || 6), 24) || 6;
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
  const { data, error, count: totalProjects } = await projQuery;

  const { data: recentEntries } = await supabase
    .from('entries')
    .select('id, type, amount, unit, date, co2e_value, co2e_unit, project_id, projects(name)')
    .order('date', { ascending: false })
    .limit(10);

  if (error) {
    return <div>Projeler yüklenemedi: {error.message}</div>;
  }

  // Calculate last 30 days total CO2e (filtered by active org if present)
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const last30Str = last30.toISOString().slice(0, 10);

  let last30Query = supabase
    .from('entries')
    .select('co2e_value, type, project_id, projects!inner(name, organization_id)')
    .gte('date', last30Str);
  const { data: last30Entries } = await last30Query;
  const totalCO2e = last30Entries?.reduce((sum, entry) => sum + (entry.co2e_value || 0), 0) || 0;
  
  // Get counts
  const projectCount = totalProjects || 0;
  const entryCount = recentEntries?.length || 0;
  
  // Group emissions by type for chart (last 30 days)
  const emissionsByType = last30Entries?.reduce((acc: Record<string, number>, entry) => {
    const type = entry.type || 'Diğer';
    acc[type] = (acc[type] || 0) + (entry.co2e_value || 0);
    return acc;
  }, {}) || {};
  
  const emissionChartData = Object.entries(emissionsByType).map(([type, value]) => ({
    type,
    value: Number(value)
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">{dict.dashboard.title}</h1>
          <p className="text-white/70">{dict.dashboard.welcome}, {user.email ? user.email.split('@')[0] : 'Kullanıcı'}</p>
        </div>
      </div>

      {/* Projects toolbar */}
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
          </select>
          
          <button className="btn-primary text-sm font-medium flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
            <span>Uygula</span>
          </button>
        </div>
      </form>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard 
          title={dict.stats.totalProjects}
          value={projectCount}
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          )}
        />
        <StatsCard 
          title={dict.stats.last30Emissions}
          value={`${totalCO2e.toFixed(2)} kg`}
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v2"></path>
              <path d="M16 2v2"></path>
              <circle cx="12" cy="11" r="7"></circle>
              <path d="M8 16.9c1.1.8 2.5 1.1 3.8 1.1s2.7-.3 3.8-1.1"></path>
              <path d="M12 16v2"></path>
              <path d="M12 13v2"></path>
              <path d="M12 18v4"></path>
              <path d="M8 22h8"></path>
            </svg>
          )}
          trend="up"
          trendText="Son 30 gün"
        />
        <StatsCard 
          title={dict.stats.recentEntries}
          value={entryCount}
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <path d="M14 2v6h6"></path>
              <path d="M16 13H8"></path>
              <path d="M16 17H8"></path>
              <path d="M10 9H8"></path>
            </svg>
          )}
        />
        <StatsCard 
          title="Kayıt Başına Ortalama"
          value={`${(totalCO2e / Math.max(1, last30Entries?.length || 0)).toFixed(2)} kg`}
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18"></path>
              <path d="M3 19h18"></path>
              <path d="M7 15l4-4 3 3 5-5"></path>
            </svg>
          )}
        />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Section */}
        <DashboardCard 
          title={dict.cards.myProjects}
          icon={<Folder size={18} />}
          className="lg:col-span-2"
          footer={
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/60">{projectCount} proje</span>
              <CreateProjectDialog />
            </div>
          }
        >
          {(!data || data.length === 0) ? (
            <div className="text-center py-10">
              <div className="bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 border border-white/10 shadow-md">
                <Plus size={30} className="text-leaf-400" />
              </div>
              <h3 className="font-medium text-lg mb-3 highlight-text">{dict.misc.noData}</h3>
              <p className="text-white/70 text-sm mb-5">{dict.cta.createProject}</p>
              <Button className="btn-primary">
                <span className="font-medium">{dict.cta.createProject}</span>
                <Plus size={18} className="ml-2" />
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {data.map((p) => (
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
                        href={`/projects/${p.id}/entries/new`}
                      >
                        <Plus size={12} />
                        <span>Kayıt Ekle</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Projects pagination */}
        {projectCount > limit && (
          <div className="lg:col-span-2 flex items-center justify-center mt-2">
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
                {page} / {Math.ceil(projectCount / limit)}
              </span>
              
              {page * limit < projectCount ? (
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
        
        {/* Recent Activity */}
        <DashboardCard 
          title={dict.cards.recentActivities}
          icon={<Calendar size={18} />}
          footer={
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/60">Son 10 kayıt</span>
              <Button size="sm" variant="ghost" className="text-xs">
                <Link href={"/entries" as any} className="flex items-center gap-1">
                  {dict.cta.viewAll}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </Button>
            </div>
          }
        >
          {(!recentEntries || recentEntries.length === 0) ? (
            <div className="text-center py-8">
              <div className="bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-md">
                <Calendar size={24} className="text-leaf-400/70" />
              </div>
              <p className="text-white/70 text-sm font-medium highlight-text">{dict.misc.noData}</p>
            </div>
          ) : (
            <div className="space-y-3 -mx-5">
              {recentEntries.map((e) => (
                <div key={e.id} className="px-5 py-3 border-b border-white/5 last:border-0 hover:bg-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{(e.projects as any)?.name}</div>
                      <div className="text-white/70 text-xs flex items-center gap-2">
                        <span>{e.type}</span>
                        <span>•</span>
                        <span>{e.amount} {e.unit}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-leaf-400 font-medium">{e.co2e_value ?? '-'} {e.co2e_unit ?? 'kg'}</div>
                      <div className="text-white/60 text-xs">{new Date(e.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
      
      {/* Emissions Overview */}
      <DashboardCard 
        title={dict.cards.emissionAnalysis}
        icon={<BarChart2 size={18} />}
        footer={
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/60">Emisyon Dağılımı</span>
            <Button size="sm" variant="ghost" className="text-xs">
              <Link href="/reports" className="flex items-center gap-1">
                Detaylı Rapor
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </Button>
          </div>
        }
      >
        {emissionChartData.length > 0 ? (
          <EmissionsChart data={emissionChartData} total={totalCO2e} />
        ) : (
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent rounded-lg border border-white/5">
            <div className="text-center">
              <div className="bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-md">
                <BarChart2 size={24} className="text-leaf-400/70" />
              </div>
              <p className="text-white/70 mb-4 text-sm font-medium highlight-text">Henüz emisyon verisi bulunmuyor</p>
              <Button className="bg-gradient-to-r from-leaf-600/80 to-ocean-600/80 hover:from-leaf-500 hover:to-ocean-500 px-4 py-2 rounded-md text-white transition-all duration-300 shadow-sm hover:shadow-md">
                <Link href={"/projects" as any} className="flex items-center gap-2">
                  <Plus size={16} />
                  <span>Proje Oluştur</span>
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}