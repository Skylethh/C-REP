import { createClient } from '@/lib/server';
import { addMember, removeMember } from './server';
import InviteForm from './InviteForm';

export default async function MembersPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id, role')
    .eq('project_id', params.id);

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Üyeler</h1>
      <InviteForm projectId={params.id} />

      <form action={addMember.bind(null, params.id)} className="flex gap-2">
        <input name="email" type="email" placeholder="kullanici@ornek.com" className="flex-1 rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        <select name="role" className="rounded-md bg-emerald-900 border border-white/10 px-3 py-2">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <button className="rounded-md bg-green-600 px-3">Ekle</button>
      </form>

      <ul className="space-y-2">
        {members?.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between rounded-md border border-white/10 p-3">
            <span className="text-sm">{m.user_id}</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-300/80">{m.role}</span>
              <form action={removeMember.bind(null, params.id)}>
                <input type="hidden" name="user_id" value={m.user_id} />
                <button className="text-red-400">Kaldır</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


