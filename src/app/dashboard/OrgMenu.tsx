import { createClient } from '@/lib/server';
import { cookies } from 'next/headers';
import { switchOrg } from '@/app/org/actions';

export default async function OrgMenu() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const c = await cookies();
  const activeOrg = c.get('active_org')?.value;

  const { data: orgs } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (!orgs || orgs.length === 0) return null;

  return (
    <form action={switchOrg} className="flex items-center gap-2">
      <label className="text-xs text-green-300/80">Org</label>
      <select
        name="org_id"
        defaultValue={activeOrg}
        className="bg-transparent border border-white/15 rounded-md px-2 py-1 text-sm"
      >
        {orgs.map((o) => (
          <option key={o.organization_id} value={o.organization_id}>{o.organizations?.name ?? o.organization_id}</option>
        ))}
      </select>
      <button type="submit" className="text-xs underline">Seç</button>
    </form>
  );
}


