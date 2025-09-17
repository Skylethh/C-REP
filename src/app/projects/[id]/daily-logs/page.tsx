import { createClient } from '@/lib/server';
import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

type Props = { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } };

export default async function DailyLogsPage({ params, searchParams }: Props) {
  const { id } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?error=login_required` as unknown) as Route);

  // View mode and month from query
  const view = (typeof searchParams?.view === 'string' ? searchParams?.view : 'calendar');
  const monthParam = typeof searchParams?.month === 'string' ? searchParams?.month : undefined; // YYYY-MM
  const today = new Date();
  const base = monthParam ? new Date(monthParam + '-01') : new Date(today.getFullYear(), today.getMonth(), 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const startISO = monthStart.toISOString().slice(0, 10);
  const endISO = monthEnd.toISOString().slice(0, 10);

  // Fetch logs for current month for calendar markers and recent list for list view
  const [monthLogsRes, listLogsRes] = await Promise.all([
    supabase
      .from('daily_logs')
      .select('id,date')
      .eq('project_id', id)
      .gte('date', startISO)
      .lte('date', endISO),
    supabase
      .from('daily_logs')
      .select('id,date,weather,notes')
      .eq('project_id', id)
      .order('date', { ascending: false })
      .limit(60)
  ]);

  const error = monthLogsRes.error || listLogsRes.error;
  if (error) return <div>Günlükler yüklenemedi: {error.message}</div>;

  const monthLogs = (monthLogsRes.data || []) as { id: string; date: string }[];
  const list = (listLogsRes.data || []) as { id: string; date: string; weather: string | null; notes: string | null }[];
  const mapByDate = new Map<string, string>();
  for (const m of monthLogs) mapByDate.set(m.date, m.id);

  function fmtMonthLabel(d: Date) {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  }

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const prevParam = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}`;
  const nextParam = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth()+1).padStart(2,'0')}`;
  const todayISO = today.toISOString().slice(0,10);

  return (
    <div className="min-h-screen">
      {/* Back Button */}
      <div className="mb-4">
        <Link href={( `/projects/${id}` as unknown) as Route} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          <span>Proje Paneline Dön</span>
        </Link>
      </div>

      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/80 to-ocean-900/80 border border-white/10 shadow-lg mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-30"></div>
        
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h1 className="text-2xl font-bold highlight-text">Saha Günlükleri</h1>
            </div>
            
            <Link href={( `/projects/${id}/daily-logs/new?date=${todayISO}` as unknown) as Route} className="btn-primary flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>Bugünün Günlüğünü Ekle</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="glass p-4 mb-6 rounded-xl border border-white/10">
        <div className="flex items-center gap-2">
          <Link href={( `/projects/${id}/daily-logs?view=calendar&month=${String(year)}-${String(month+1).padStart(2,'0')}` as unknown) as Route}
                className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${view !== 'list' ? 'bg-gradient-to-r from-leaf-600/80 to-ocean-600/80 text-white shadow-md' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Takvim Görünümü</span>
          </Link>
          <Link href={( `/projects/${id}/daily-logs?view=list` as unknown) as Route}
                className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${view === 'list' ? 'bg-gradient-to-r from-leaf-600/80 to-ocean-600/80 text-white shadow-md' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
            </svg>
            <span>Liste Görünümü</span>
          </Link>
        </div>
      </div>

      {view === 'list' ? (
        <div className="glass p-6 rounded-xl border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Son Günlükler</h2>
          </div>
          
          <div className="space-y-3">
            {list.map((l) => (
              <Link key={l.id} href={( `/projects/${id}/daily-logs/${l.id}` as unknown) as Route} className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 border border-white/10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-white">{new Date(l.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      <div className="text-white/70 text-sm flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18.36 6.64A9 9 0 0 1 20.77 15"></path>
                            <path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"></path>
                            <path d="M12 2v4"></path>
                            <path d="M2 12h4"></path>
                          </svg>
                          {l.weather || 'Belirtilmedi'}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <path d="M14 2v6h6"></path>
                            <path d="M16 13H8"></path>
                            <path d="M16 17H8"></path>
                          </svg>
                          {l.notes ? `${l.notes.slice(0, 50)}${l.notes.length > 50 ? '...' : ''}` : 'Not yok'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </Link>
            ))}
            {(list.length === 0) && (
              <div className="text-center py-12">
                <div className="bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2 text-white/80">Henüz günlük yok</h3>
                <p className="text-white/60">Bu projede henüz günlük kaydı bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass p-6 rounded-xl border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Takvim Görünümü</h2>
          </div>
          
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6 p-3 rounded-lg bg-white/5 border border-white/10">
            <Link href={( `/projects/${id}/daily-logs?view=calendar&month=${prevParam}` as unknown) as Route} className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              <span className="text-sm">Önceki Ay</span>
            </Link>
            <div className="text-xl font-semibold highlight-text">{fmtMonthLabel(monthStart)}</div>
            <Link href={( `/projects/${id}/daily-logs?view=calendar&month=${nextParam}` as unknown) as Route} className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200">
              <span className="text-sm">Sonraki Ay</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </Link>
          </div>
          
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-sm text-white/70 mb-3 font-medium">
            {['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const nodes: JSX.Element[] = [];
              const firstWeekday = (monthStart.getDay() + 6) % 7; // Monday=0
              const daysInMonth = monthEnd.getDate();
              const totalCells = Math.ceil((firstWeekday + daysInMonth)/7)*7;
              for (let i=0;i<totalCells;i++) {
                const dayNum = i - firstWeekday + 1;
                const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
                const dateObj = new Date(year, month, Math.min(Math.max(dayNum,1), daysInMonth));
                const dateISO = dateObj.toISOString().slice(0,10);
                const logId = inMonth ? mapByDate.get(dateISO) : undefined;
                const isToday = dateISO === todayISO;
                nodes.push(
                  <Link
                    key={i}
                    href={( inMonth ? (logId ? (`/projects/${id}/daily-logs/${logId}` as unknown) as Route : (`/projects/${id}/daily-logs/new?date=${dateISO}` as unknown) as Route) : ( `/projects/${id}/daily-logs?view=calendar&month=${String(year)}-${String(month+1).padStart(2,'0')}` as unknown) as Route )}
                    className={`aspect-square rounded-lg border transition-all duration-200 p-3 flex flex-col items-start justify-between min-h-[80px] ${
                      inMonth 
                        ? 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:shadow-md' 
                        : 'border-transparent bg-transparent opacity-40 cursor-default'
                    } ${isToday ? 'ring-2 ring-leaf-400/50 bg-leaf-500/10' : ''}`}
                  >
                    <div className={`text-sm font-medium ${isToday ? 'text-leaf-300' : inMonth ? 'text-white/90' : 'text-white/40'}`}>
                      {inMonth ? dayNum : ''}
                    </div>
                    {inMonth && (
                      <div className="w-full flex justify-end">
                        {logId ? (
                          <div className="flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span className="text-xs text-emerald-300">Günlük var</span>
                          </div>
                        ) : (
                          <span className="text-xs text-white/40">Günlük ekle</span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              }
              return nodes;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
