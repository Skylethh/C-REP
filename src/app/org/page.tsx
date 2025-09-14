import { createClient } from '@/lib/server';
import { createOrganization } from './server';

export default async function OrgPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: orgs } = await supabase
    .from('organization_members')
    .select('organization_id, role, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Organizasyonlarım</h1>
      <form action={createOrganization} className="flex gap-2">
        <input name="name" placeholder="Yeni organizasyon adı" className="flex-1 rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        <button className="rounded-md bg-green-600 px-3">Oluştur</button>
      </form>
      <ul className="space-y-2">
        {orgs?.map((o) => (
          <li key={o.organization_id} className="rounded-md border border-white/10 p-3 bg-white/5 text-sm">
            <div className="flex items-center justify-between">
              <span>{o.organization_id}</span>
              <span className="text-green-300/80">{o.role}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


