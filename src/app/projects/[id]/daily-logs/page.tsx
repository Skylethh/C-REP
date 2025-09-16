import { createClient } from '@/lib/server';
import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default async function DailyLogsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?error=login_required` as unknown) as Route);

  const { data: logs, error } = await supabase
    .from('daily_logs')
    .select('id,date,weather,notes')
    .eq('project_id', id)
    .order('date', { ascending: false })
    .limit(50);

  if (error) return <div>Günlükler yüklenemedi: {error.message}</div>;

  type DailyLog = { id: string; date: string; weather: string | null; notes: string | null };
  const list = (logs || []) as DailyLog[];

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Saha Günlükleri</h1>
  <Link href={( `/projects/${id}/daily-logs/new` as unknown) as Route} className="btn-primary">Yeni Günlük</Link>
      </div>
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
    </div>
  );
}
