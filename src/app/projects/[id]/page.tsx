import { createClient } from '@/lib/server';
import { EvidenceUploader } from '@/components/EvidenceUploader';
import Link from 'next/link';
import { EvidenceList } from '@/components/EvidenceList';
import { getMessages } from '@/i18n';

export default async function ProjectDetail({ params, searchParams }: { params: { id: string }, searchParams: Record<string, string | string[] | undefined> }) {
  const { dict } = await getMessages();
  const p = params;
  const sp = searchParams || {} as Record<string, string | string[] | undefined>;
  const showSuccess = sp?.success === 'true';
  const successMessage = sp?.message as string || 'İşlem başarıyla tamamlandı';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>{dict.misc?.unauthorized ?? 'Yetkisiz'}</div>;

  const limit = Math.min(Number(sp?.limit ?? 10), 50);
  const page = Number(sp?.page ?? 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const start = String(sp?.start || '');
  const end = String(sp?.end || '');
  const filterType = ['energy','transport','materials','other'].includes(String(sp?.type)) ? String(sp?.type) : '';
  const filterScope = ['scope1','scope2','scope3'].includes(String(sp?.scope)) ? String(sp?.scope) : '';
  const filterCategory = String(sp?.category || '');

  const entriesQuery = supabase
    .from('entries')
    .select('id, type, amount, unit, date, co2e_value, co2e_unit, scope, category', { count: 'exact' })
    .eq('project_id', p.id)
    .order('date', { ascending: false })
    .range(from, to);
  if (start) entriesQuery.gte('date', start);
  if (end) entriesQuery.lte('date', end);
  if (filterType) entriesQuery.eq('type', filterType);
  if (filterScope) entriesQuery.eq('scope', filterScope);
  if (filterCategory) entriesQuery.ilike('category', `%${filterCategory}%`);

  const totalsQuery = supabase
    .from('entries')
    .select('co2e_value')
    .eq('project_id', p.id);
  if (start) totalsQuery.gte('date', start);
  if (end) totalsQuery.lte('date', end);
  if (filterType) totalsQuery.eq('type', filterType);
  if (filterScope) totalsQuery.eq('scope', filterScope);
  if (filterCategory) totalsQuery.ilike('category', `%${filterCategory}%`);

  const [{ data: project }, { data: entries, count }, { data: evidence }, { data: totals }] = await Promise.all([
    supabase.from('projects').select('id, name, description').eq('id', p.id).maybeSingle(),
    entriesQuery,
    supabase.from('evidence_files').select('id, file_path, mime, size, created_at, entry_id', { count: 'exact' }).eq('project_id', p.id).order('created_at', { ascending: false }).range(from, to),
    totalsQuery
  ]);

      if (!project) return <div>{dict.misc?.notFound ?? 'Proje bulunamadı'}</div>;

      {/* Başarı mesajı */}
      {showSuccess && (
        <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-200 flex items-center gap-3 animate-fadeIn">
          <div className="p-1.5 rounded-full bg-green-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div>
            <p className="font-medium">{successMessage}</p>
          </div>
        </div>
      )}

  const totalByType = (entries ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + (Number(e.co2e_value) || 0);
    return acc;
  }, {});
  const totalByScope = (entries ?? []).reduce<Record<string, number>>((acc, e) => {
    const key = (e as any).scope || 'unknown';
    acc[key] = (acc[key] || 0) + (Number(e.co2e_value) || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/80 to-ocean-900/80 border border-white/10 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-30"></div>
        
        <div className="relative p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href="/dashboard"
                  className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/15 px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  <span>Dashboard'a Dön</span>
                </Link>
              </div>
              <h1 className="text-3xl font-bold mb-2 highlight-text">{project.name}</h1>
              <p className="text-white/70 max-w-2xl">{project.description || 'Bu proje için henüz bir açıklama girilmemiş.'}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Link 
                href={`/projects/${project.id}/entries/new`}
                className="bg-gradient-to-r from-leaf-600/90 to-ocean-600/90 hover:from-leaf-500/90 hover:to-ocean-500/90 px-4 py-2.5 rounded-lg text-white transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span>Yeni Kayıt Ekle</span>
              </Link>
              
              <Link 
                href={`/projects/${project.id}/export`}
                className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/15 px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>CSV İndir</span>
              </Link>

              <Link 
                href={`/projects/${project.id}/daily-logs`}
                className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/15 px-4 py-2.5 rounded-lg transition-all duration-200"
              >
                Günlükler
              </Link>

              <Link 
                href={`/projects/${project.id}/rfi`}
                className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/15 px-4 py-2.5 rounded-lg transition-all duration-200"
              >
                RFI
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CO2e Özet Kartları */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Toplam CO2e Kartı */}
        <div className="stats-card col-span-2 md:col-span-2 lg:col-span-2">
          <div className="flex items-start justify-between">
        <div>
              <div className="text-sm text-white/70 mb-1">Toplam Emisyon</div>
              <div className="text-3xl font-bold highlight-text">
                {(totals?.reduce((s, r) => s + (Number(r.co2e_value) || 0), 0) || 0).toFixed(2)} kg
              </div>
              <div className="text-xs text-white/60 mt-1">CO₂ eşdeğeri</div>
            </div>
            <div className="p-3 rounded-full bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                <path d="M2 22h20"></path>
                <path d="M20 15H4c-1 0-2-.5-2-2V4c0-1.5 1-2 2-2h16c1 0 2 .5 2 2v9c0 1.5-1 2-2 2z"></path>
                <path d="M14 4v18"></path>
                <path d="M6 15v7"></path>
              </svg>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white/5 border border-white/10 p-3">
              <div className="text-xs text-white/60 mb-1">Kayıt Sayısı</div>
              <div className="text-xl font-semibold">{entries?.length || 0}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3">
              <div className="text-xs text-white/60 mb-1">Ortalama</div>
              <div className="text-xl font-semibold">
                {entries && entries.length > 0 
                  ? ((totals?.reduce((s, r) => s + (Number(r.co2e_value) || 0), 0) || 0) / entries.length).toFixed(2) 
                  : "0.00"} kg
              </div>
            </div>
          </div>
        </div>
        
        {/* Tür Bazında CO2e Kartı */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-base">{dict.cards?.emissionByType ?? 'Tür Bazında Emisyon'}</h3>
            <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                <path d="M3 3v18h18"></path>
                <path d="M7 17v-8"></path>
                <path d="M11 17v-5"></path>
                <path d="M15 17v-3"></path>
                <path d="M19 17v-1"></path>
              </svg>
        </div>
      </div>

          <ul className="space-y-3">
            {Object.entries(totalByType).length === 0 ? (
              <li className="text-sm text-white/50 italic">Henüz veri yok</li>
            ) : (
              Object.entries(totalByType).map(([k,v]) => {
                const total = totals?.reduce((s, r) => s + (Number(r.co2e_value) || 0), 0) || 0;
                const percentage = total > 0 ? (v / total) * 100 : 0;
                
                let colorClass = 'bg-leaf-500';
                if (k === 'transport') colorClass = 'bg-blue-500';
                if (k === 'materials') colorClass = 'bg-amber-500';
                if (k === 'other') colorClass = 'bg-purple-500';
                
                return (
                  <li key={k} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="capitalize">{k}</span>
                      <span className="font-medium">{v.toFixed(2)} kg</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colorClass} rounded-full`} 
                        style={{width: `${Math.max(percentage, 3)}%`}}
                      ></div>
                    </div>
                    <div className="text-xs text-white/50 text-right">{percentage.toFixed(1)}%</div>
                  </li>
                );
              })
            )}
            </ul>
          </div>
        
        {/* Scope Bazında CO2e Kartı */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-base">{dict.cards?.emissionByScope ?? 'Scope Bazında Emisyon'}</h3>
            <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
            </div>
          </div>
          
          <ul className="space-y-3">
            {Object.entries(totalByScope).length === 0 ? (
              <li className="text-sm text-white/50 italic">Henüz veri yok</li>
            ) : (
              Object.entries(totalByScope).map(([k,v]) => {
                const total = totals?.reduce((s, r) => s + (Number(r.co2e_value) || 0), 0) || 0;
                const percentage = total > 0 ? (v / total) * 100 : 0;
                
                let colorClass = 'bg-emerald-500';
                if (k === 'scope2') colorClass = 'bg-blue-500';
                if (k === 'scope3') colorClass = 'bg-amber-500';
                if (k === 'unknown') colorClass = 'bg-gray-500';
                
                let scopeLabel = k;
                if (k === 'scope1') scopeLabel = 'Scope 1';
                if (k === 'scope2') scopeLabel = 'Scope 2';
                if (k === 'scope3') scopeLabel = 'Scope 3';
                if (k === 'unknown') scopeLabel = 'Bilinmeyen';
                
                return (
                  <li key={k} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>{scopeLabel}</span>
                      <span className="font-medium">{v.toFixed(2)} kg</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colorClass} rounded-full`} 
                        style={{width: `${Math.max(percentage, 3)}%`}}
                      ></div>
                    </div>
                    <div className="text-xs text-white/50 text-right">{percentage.toFixed(1)}%</div>
                  </li>
                );
              })
            )}
            </ul>
          </div>
      </section>
        {/* Kayıtlar Başlığı ve Filtreleme */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <path d="M14 2v6h6"></path>
                  <path d="M16 13H8"></path>
                  <path d="M16 17H8"></path>
                  <path d="M10 9H8"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold">{dict.cards?.entries ?? 'Kayıtlar'}</h2>
            </div>
            
            <div className="flex items-center gap-3">
              <Link 
                href={`/projects/${project.id}/export?start=${start}&end=${end}&type=${filterType}&scope=${filterScope}&category=${encodeURIComponent(filterCategory)}`}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-1.5 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>CSV İndir</span>
              </Link>
            </div>
          </div>
          
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="form-label">Başlangıç Tarihi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <input 
                    name="start" 
                    type="date" 
                    defaultValue={start} 
                    className="form-input pl-10" 
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="form-label">Bitiş Tarihi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
        </div>
                  <input 
                    name="end" 
                    type="date" 
                    defaultValue={end} 
                    className="form-input pl-10" 
                  />
          </div>
          </div>
              
              <div className="space-y-1">
                <label className="form-label">Tür</label>
                <select name="type" defaultValue={filterType} className="form-input">
                  <option value="">Tüm Türler</option>
              <option value="energy">Enerji</option>
              <option value="transport">Ulaşım</option>
              <option value="materials">Malzeme</option>
              <option value="other">Diğer</option>
            </select>
          </div>
              
              <div className="space-y-1">
                <label className="form-label">Scope</label>
                <select name="scope" defaultValue={filterScope} className="form-input">
                  <option value="">Tüm Scope'lar</option>
              <option value="scope1">Scope 1</option>
              <option value="scope2">Scope 2</option>
              <option value="scope3">Scope 3</option>
            </select>
          </div>
              
              <div className="space-y-1">
                <label className="form-label">Kategori</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.3-4.3"></path>
                    </svg>
                  </div>
                  <input 
                    name="category" 
                    defaultValue={filterCategory} 
                    placeholder="örn. elektrik" 
                    className="form-input pl-10" 
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <button 
                className="bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500 px-4 py-2 rounded-lg text-white transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>Filtreleri Uygula</span>
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-sm">Toplam CO₂e:</span>
                <span className="text-lg font-semibold highlight-text">{(totals?.reduce((s, r) => s + (Number(r.co2e_value) || 0), 0) || 0).toFixed(2)} kg</span>
              </div>
            </div>
          </form>
        </div>
        <div className="mt-6 space-y-6">
          {(!entries || entries.length === 0) ? (
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-8 text-center">
              <div className="bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <path d="M14 2v6h6"></path>
                  <path d="M16 13H8"></path>
                  <path d="M16 17H8"></path>
                  <path d="M10 9H8"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">{dict.misc?.noData ?? 'Henüz Kayıt Yok'}</h3>
              <p className="text-white/60 mb-5">Bu projede henüz kayıt bulunmuyor. Yeni bir kayıt ekleyerek başlayabilirsiniz.</p>
              <Link 
                href={`/projects/${project.id}/entries/new`}
                className="bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500 px-4 py-2.5 rounded-lg text-white transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto inline-flex"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span>İlk Kaydı Ekle</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {entries?.map((e) => {
                const entryEvidence = (evidence || []).filter((x: any) => x.entry_id === e.id);
                
                // Tür için renk ve ikon belirleme
                let typeColor = 'bg-leaf-500';
                let typeIcon = (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.36 6.64A9 9 0 0 1 20.77 15"></path>
                    <path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"></path>
                    <path d="M12 2v4"></path>
                    <path d="M2 12h4"></path>
                    <path d="m4.93 4.93 2.83 2.83"></path>
                    <path d="m16.24 16.24 2.83 2.83"></path>
                  </svg>
                );
                
                if (e.type === 'transport') {
                  typeColor = 'bg-blue-500';
                  typeIcon = (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="3" width="15" height="13"></rect>
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                      <circle cx="5.5" cy="18.5" r="2.5"></circle>
                      <circle cx="18.5" cy="18.5" r="2.5"></circle>
                    </svg>
                  );
                } else if (e.type === 'materials') {
                  typeColor = 'bg-amber-500';
                  typeIcon = (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.29 7 12 12 20.71 7"></polyline>
                      <line x1="12" y1="22" x2="12" y2="12"></line>
                    </svg>
                  );
                } else if (e.type === 'other') {
                  typeColor = 'bg-purple-500';
                  typeIcon = (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                  );
                }
                
                // Scope için renk ve etiket belirleme
                let scopeColor = 'bg-emerald-500/20 text-emerald-300';
                let scopeLabel = 'Bilinmeyen';
                
                if (e.scope === 'scope1') {
                  scopeColor = 'bg-emerald-500/20 text-emerald-300';
                  scopeLabel = 'Scope 1';
                } else if (e.scope === 'scope2') {
                  scopeColor = 'bg-blue-500/20 text-blue-300';
                  scopeLabel = 'Scope 2';
                } else if (e.scope === 'scope3') {
                  scopeColor = 'bg-amber-500/20 text-amber-300';
                  scopeLabel = 'Scope 3';
                }
                
                return (
                  <div key={e.id} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-md hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${typeColor} bg-opacity-20 flex-shrink-0`}>
                          <div className={`text-${typeColor.split('-')[1]}-300`}>
                            {typeIcon}
                          </div>
                        </div>
                        
          <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-base capitalize">{e.type}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${scopeColor}`}>{scopeLabel}</span>
                            {e.category && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">{e.category}</span>
                            )}
                          </div>
                          <div className="text-white/70 text-sm">
                            <span className="font-medium">{e.amount} {e.unit}</span>
                            <span className="mx-2 text-white/40">•</span>
                            <span>{new Date(e.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-white/60">CO₂ Eşdeğeri</div>
                          <div className="text-xl font-semibold highlight-text">{e.co2e_value ?? '-'} {e.co2e_unit ?? 'kg'}</div>
                        </div>
                        
                        <button 
                          className="p-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                          onClick={() => {
                            // Kanıt bölümünü aç/kapa
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Kanıt bölümü - varsayılan olarak kapalı */}
                    <div className="mt-4 pt-4 border-t border-white/5 hidden">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium">Kanıtlar</h4>
                        <button className="text-xs text-white/60 hover:text-white underline">Tümünü Göster</button>
                      </div>
                      
                      <EvidenceUploader projectId={project.id} entryId={e.id} />
                      
                      {entryEvidence.length > 0 ? (
                        <EvidenceList projectId={project.id} items={entryEvidence as any} />
                      ) : (
                        <div className="text-sm text-white/60 bg-white/5 rounded-lg p-4 text-center">
                          {dict.misc?.noEvidence ?? 'Bu kayda ekli kanıt yok.'}
                        </div>
                      )}
          </div>
              </div>
                );
              })}
              
              {/* Sayfalama Kontrolü */}
              {(page > 1 || (count ?? 0) > page*limit) && (
                <div className="flex items-center justify-center mt-6">
                  <div className="inline-flex items-center gap-2 rounded-md bg-white/5 border border-white/10 p-1">
          {page > 1 ? (
            <Link
              href={`/projects/${project.id}?page=${page-1}&limit=${limit}&start=${start}&end=${end}&type=${filterType}&scope=${filterScope}&category=${encodeURIComponent(filterCategory)}`}
                        className="p-2 rounded-md hover:bg-white/10 transition-all text-white/80 hover:text-white"
                      >
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
                      {page} / {Math.ceil((count ?? 0) / limit)}
                    </span>
                    
          {(count ?? 0) > page*limit ? (
            <Link
              href={`/projects/${project.id}?page=${page+1}&limit=${limit}&start=${start}&end=${end}&type=${filterType}&scope=${filterScope}&category=${encodeURIComponent(filterCategory)}`}
                        className="p-2 rounded-md hover:bg-white/10 transition-all text-white/80 hover:text-white"
                      >
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
          )}
        </div>
      {/* CSV Export section removed - already included in the filters section */}
    </div>
  );
}


