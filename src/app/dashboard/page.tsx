import { createClient } from '@/lib/server';
import Link from 'next/link';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { cookies } from 'next/headers';
import { createProject } from './actions';
import OrgMenu from './OrgMenu';

export default async function DashboardPage() {
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

  const c = await cookies();
  const activeOrg = c.get('active_org')?.value;
  const query = supabase
    .from('projects')
    .select('id, name, description, created_at')
    .order('created_at', { ascending: false });
  const { data, error } = activeOrg ? await query.eq('organization_id', activeOrg) : await query;

  const { data: recentEntries } = await supabase
    .from('entries')
    .select('id, type, amount, unit, date, co2e_value, co2e_unit, project_id, projects(name)')
    .order('date', { ascending: false })
    .limit(10);

  if (error) {
    return <div>Projeler yüklenemedi: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Projeler</h1>
          <OrgMenu />
        </div>
        <CreateProjectDialog action={createProject} />
      </div>
      {(!data || data.length === 0) ? (
        <div className="rounded-md border border-white/10 p-6 bg-white/5 text-green-300/80">
          Henüz bir projen yok. Hemen yeni bir proje oluştur.
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {data.map((p) => (
            <li key={p.id} className="rounded-lg border border-white/10 p-4 bg-white/5">
              <div className="font-medium">
                <Link className="hover:underline" href={`/projects/${p.id}`}>{p.name}</Link>
              </div>
              <div className="text-green-300/80 text-sm mb-3">{p.description}</div>
              <div className="flex items-center gap-3 text-sm">
                <Link className="underline" href={`/projects/${p.id}`}>Projeyi Gör</Link>
                <Link className="underline" href={`/projects/${p.id}/entries/new`}>Yeni Kayıt</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Son Kayıtlar</h2>
        <ul className="space-y-2">
          {recentEntries?.map((e) => (
            <li key={e.id} className="rounded-md border border-white/10 p-3 bg-white/5">
              <div className="flex items-center justify-between">
                <span>{e.projects?.name ?? 'Proje'}: {e.type} — {e.amount} {e.unit} ({e.date})</span>
                <span className="text-green-300/80">{e.co2e_value ?? '-'} {e.co2e_unit ?? 'kg'}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


