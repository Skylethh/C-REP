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
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Saha Günlükleri</h1>
        <Link href={( `/projects/${id}/daily-logs/new?date=${todayISO}` as unknown) as Route} className="btn-primary">+ Bugünün Günlüğünü Ekle</Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <Link href={( `/projects/${id}/daily-logs?view=calendar&month=${String(year)}-${String(month+1).padStart(2,'0')}` as unknown) as Route}
              className={`px-3 py-1.5 rounded ${view !== 'list' ? 'bg-white/20' : 'bg-white/5'} border border-white/10`}>Takvim</Link>
        <Link href={( `/projects/${id}/daily-logs?view=list` as unknown) as Route}
              className={`px-3 py-1.5 rounded ${view === 'list' ? 'bg-white/20' : 'bg-white/5'} border border-white/10`}>Liste Görünümü</Link>
      </div>

      {view === 'list' ? (
        <div className="space-y-2">
          {list.map((l) => (
            <Link key={l.id} href={( `/projects/${id}/daily-logs/${l.id}` as unknown) as Route} className="block glass p-4 rounded border border-white/10">
              <div className="font-medium">{new Date(l.date).toLocaleDateString()}</div>
              <div className="text-white/70 text-sm">{l.weather || '-'} • {l.notes || '-'}</div>
            </Link>
          ))}
          {(list.length === 0) && (
            <div className="text-white/60">Henüz günlük yok.</div>
          )}
        </div>
      ) : (
        <div className="">
          {/* Month header */}
          <div className="flex items-center justify-between mb-3">
            <Link href={( `/projects/${id}/daily-logs?view=calendar&month=${prevParam}` as unknown) as Route} className="px-2 py-1 rounded border border-white/10 bg-white/10">←</Link>
            <div className="text-lg font-medium">{fmtMonthLabel(monthStart)}</div>
            <Link href={( `/projects/${id}/daily-logs?view=calendar&month=${nextParam}` as unknown) as Route} className="px-2 py-1 rounded border border-white/10 bg-white/10">→</Link>
          </div>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-white/70 mb-1">
            {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((d) => (<div key={d}>{d}</div>))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
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
                    className={`aspect-square rounded border border-white/10 p-1 flex flex-col items-start justify-between ${inMonth ? 'bg-white/5' : 'bg-transparent opacity-40'}`}
                  >
                    <div className={`text-xs ${isToday ? 'text-emerald-300' : 'text-white/80'}`}>{inMonth ? dayNum : ''}</div>
                    {inMonth && (
                      <div className="w-full flex justify-end">
                        {logId ? <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span> : <span className="inline-block w-2 h-2 rounded-full bg-white/20"></span>}
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
