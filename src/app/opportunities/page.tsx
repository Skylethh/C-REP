import { createClient } from '@/lib/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OpportunitiesIndex() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Fırsatlar</h1>
        <p className="text-white/70">Devam etmek için lütfen giriş yapın.</p>
        <Link href="/login" className="underline">Giriş</Link>
      </div>
    );
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, description, created_at')
    .order('created_at', { ascending: false });

  if (!projects || projects.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Fırsatlar</h1>
        <p className="text-white/70">Henüz bir projeniz yok. Önce bir proje oluşturun, ardından proje özelinde fırsatlar üretelim.</p>
        <Link href="/projects" className="bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 px-4 py-2.5 rounded-lg transition-all duration-200 inline-block">Projelerime Git</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fırsatlar</h1>
        <Link href="/projects" className="text-sm underline text-white/80 hover:text-white">Projelerim</Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map(p => (
          <div key={p.id} className="data-card hover:border-leaf-400/30 hover:bg-white/10 transition-all duration-300 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-base group-hover:text-leaf-400 transition-colors">{p.name}</div>
              <span className="text-xs text-white/50">{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
            <div className="text-white/70 text-sm mb-4 line-clamp-2 flex-grow">{(p as any).description || '—'}</div>
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
              <Link className="bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/15 px-2 py-1 rounded-md transition-all duration-200 text-leaf-400 text-xs" href={`/projects/${p.id}`}>
                Proje Detayı
              </Link>
              <Link className="bg-gradient-to-r from-leaf-600/70 to-ocean-600/70 hover:from-leaf-500/90 hover:to-ocean-500/90 px-2 py-1 rounded-md text-white transition-all duration-200 text-xs" href={`/projects/${p.id}/opportunities`}>
                Fırsatları Gör
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


