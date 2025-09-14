import { createClient } from '@/lib/server';
import { switchOrg } from '@/app/org/actions';

export async function OrgSwitcher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: orgs } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id);

  return (
    <form action={switchOrg}>
      <select name="org_id" className="bg-transparent border border-white/20 rounded-md px-2 py-1 text-sm">
        {orgs?.map((o) => (
          <option key={o.organization_id} value={o.organization_id}>{o.organization_id}</option>
        ))}
      </select>
    </form>
  );
}


