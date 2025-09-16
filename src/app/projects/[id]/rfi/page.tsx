import { createClient } from '@/lib/server';
import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default async function RfiListPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?error=login_required` as unknown) as Route);

  const { data: items, error } = await supabase
    .from('rfi')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return <div>RFI listesi yüklenemedi: {error.message}</div>;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">RFI</h1>
  <Link href={( `/projects/${id}/rfi/new` as unknown) as Route} className="btn-primary">Yeni RFI</Link>
      </div>
      <div className="space-y-2">
        {(items || []).map((r: any) => (
          <Link key={r.id} href={( `/projects/${id}/rfi/${r.id}` as unknown) as Route} className="block glass p-4 rounded border border-white/10">
            <div className="font-medium">{r.title}</div>
            <div className="text-white/70 text-sm">Durum: {r.status} • {new Date(r.created_at).toLocaleString()}</div>
          </Link>
        ))}
        {(!items || items.length === 0) && (
          <div className="text-white/60">Henüz RFI yok.</div>
        )}
      </div>
    </div>
  );
}
