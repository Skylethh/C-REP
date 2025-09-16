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
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/80 to-ocean-900/80 border border-white/10 shadow-lg mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-30"></div>
        
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
              <h1 className="text-2xl font-bold highlight-text">RFI (Request for Information)</h1>
            </div>
            
            <Link href={( `/projects/${id}/rfi/new` as unknown) as Route} className="btn-primary flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>Yeni RFI Oluştur</span>
            </Link>
          </div>
        </div>
      </div>

      {/* RFI List */}
      <div className="glass rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <path d="M14 2v6h6"></path>
                <path d="M16 13H8"></path>
                <path d="M16 17H8"></path>
              </svg>
            </div>
            <h2 className="text-lg font-semibold">RFI Listesi</h2>
          </div>
        </div>

        {/* Table Header */}
        <div className="hidden md:grid md:grid-cols-6 px-6 py-3 text-sm font-medium text-white/70 bg-white/5 border-b border-white/10">
          <div>RFI No</div>
          <div>Konu</div>
          <div>Tarih</div>
          <div>Soran</div>
          <div>Cevap Beklenen</div>
          <div>Durum</div>
        </div>

        {/* RFI Items */}
        <div className="divide-y divide-white/10">
          {(items || []).map((r: any) => {
            const code = r.code || (r.seq ? `RFI-${String(r.seq).padStart(3,'0')}` : '-');
            const badgeCls = r.status === 'closed' 
              ? 'bg-green-500/15 text-green-300 border-green-500/30' 
              : r.status === 'answered' 
              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' 
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
            const statusText = r.status === 'open' ? 'Açık' : r.status === 'answered' ? 'Cevaplandı' : 'Kapandı';
            
            return (
              <Link key={r.id} href={( `/projects/${id}/rfi/${r.id}` as unknown) as Route} className="block hover:bg-white/5 transition-all duration-200">
                {/* Desktop Layout */}
                <div className="hidden md:grid md:grid-cols-6 px-6 py-4 items-center">
                  <div className="font-mono text-sm font-medium text-white/90">{code}</div>
                  <div className="truncate text-white font-medium">{r.title}</div>
                  <div className="text-white/70 text-sm">{new Date(r.created_at).toLocaleDateString('tr-TR')}</div>
                  <div className="text-white/80 text-sm">{r.from_party || '-'}</div>
                  <div className="text-white/80 text-sm">{r.to_role || '-'}</div>
                  <div>
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${badgeCls}`}>
                      {statusText}
                    </span>
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="md:hidden p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-white/90 bg-white/10 px-2 py-1 rounded">{code}</span>
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${badgeCls}`}>
                        {statusText}
                      </span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                  <h3 className="font-medium text-white mb-2">{r.title}</h3>
                  <div className="text-sm text-white/60 space-y-1">
                    <div>📅 {new Date(r.created_at).toLocaleDateString('tr-TR')}</div>
                    <div>👤 Soran: {r.from_party || '-'}</div>
                    <div>🎯 Hedef: {r.to_role || '-'}</div>
                  </div>
                </div>
              </Link>
            );
          })}
          
          {(!items || items.length === 0) && (
            <div className="text-center py-12">
              <div className="bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2 text-white/80">Henüz RFI yok</h3>
              <p className="text-white/60 mb-4">Bu projede henüz Request for Information kaydı bulunmuyor.</p>
              <Link href={( `/projects/${id}/rfi/new` as unknown) as Route} className="btn-primary inline-flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span>İlk RFI'yi Oluştur</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
