import { submitEntryAction } from './server';
import EntryForm from './EntryForm';
import Link from 'next/link';
import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';

export default async function NewEntryPage({ params, searchParams }: any) {
  const p = params;
  const sp = searchParams || {};
  const error = typeof sp.error === 'string' ? sp.error : '';
  
  // Fetch project information and permissions
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', p.id)
    .maybeSingle();
  let canInsert = false;
  if (user) {
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', p.id)
      .eq('user_id', user.id)
      .maybeSingle();
    canInsert = membership?.role === 'owner' || membership?.role === 'editor';
  }
  
  return (
    <div className="w-full mx-auto max-w-2xl md:max-w-3xl space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/60 to-ocean-900/60 border border-white/10 shadow-md">
        <div className="absolute inset-0 bg-gradient-to-br from-leaf-500/5 to-ocean-500/5 backdrop-blur-sm"></div>
        
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold highlight-text">Yeni Emisyon Kaydı</h1>
                {project && (
                  <p className="text-sm text-white/70 mt-0.5">{project.name}</p>
                )}
              </div>
            </div>
            
            <Link 
              href={`/projects/${p.id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-white/80 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              <span>Geri Dön</span>
            </Link>
          </div>
        </div>
      </div>
      {!user ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-100 p-4 text-sm">
          Kayıt eklemek için lütfen giriş yapın.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 p-4 text-sm">
          {error}
        </div>
      ) : null}
      {user && !canInsert ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 p-4 text-sm">
          Bu projeye kayıt ekleme yetkiniz yok. Proje sahibi veya editör olarak eklenmelisiniz.
        </div>
      ) : null}
      
      {user && canInsert ? (
        <EntryForm projectId={p.id} action={submitEntryAction} />
      ) : null}
    </div>
  );
}


