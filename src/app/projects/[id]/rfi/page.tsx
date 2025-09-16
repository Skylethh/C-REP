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
    .select('id, code, seq, title, created_at, from_party, to_role, status')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return <div>RFI listesi yüklenemedi: {error.message}</div>;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">RFI</h1>
        <Link href={( `/projects/${id}/rfi/new` as unknown) as Route} className="btn-primary">+ Yeni RFI Oluştur</Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-6 px-4 py-2 text-xs uppercase tracking-wide text-white/60 border-b border-white/10">
          <div>RFI No</div>
          <div>Konu</div>
          <div>Tarih</div>
          <div>Soran</div>
          <div>Cevap Beklenen</div>
          <div>Durum</div>
        </div>
        <div className="divide-y divide-white/10">
          {(items || []).map((r: any) => {
            const code = r.code || (r.seq ? `RFI-${String(r.seq).padStart(3,'0')}` : '-');
            const badgeCls = r.status === 'closed' ? 'bg-green-500/15 text-green-300 border-green-500/30' : r.status === 'answered' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
            return (
              <Link key={r.id} href={( `/projects/${id}/rfi/${r.id}` as unknown) as Route} className="grid grid-cols-6 px-4 py-3 hover:bg-white/5 transition">
                <div className="font-mono text-sm">{code}</div>
                <div className="truncate">{r.title}</div>
                <div className="text-white/70 text-sm">{new Date(r.created_at).toLocaleDateString()}</div>
                <div className="text-white/80 text-sm">{r.from_party || '-'}</div>
                <div className="text-white/80 text-sm">{r.to_role || '-'}</div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded border ${badgeCls}`}>{r.status === 'open' ? 'Açık' : r.status === 'answered' ? 'Cevaplandı' : 'Kapandı'}</span>
                </div>
              </Link>
            );
          })}
          {(!items || items.length === 0) && (
            <div className="px-4 py-6 text-white/60">Henüz RFI yok.</div>
          )}
        </div>
      </div>
    </div>
  );
}
