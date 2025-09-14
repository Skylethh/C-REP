"use client";
import { supabaseBrowser } from '@/lib/client';
import { useState } from 'react';

export default function InviteForm({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer'|'editor'>('viewer');
  const [msg, setMsg] = useState<string>('');
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Davet Gönder</h2>
      <div className="flex gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e-posta" className="flex-1 rounded-md bg-emerald-900 border border-white/10 px-3 py-2" />
        <select value={role} onChange={(e) => setRole(e.target.value as any)} className="rounded-md bg-emerald-900 border border-white/10 px-3 py-2">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <button
          className="rounded-md bg-green-600 px-3"
          onClick={async () => {
            setMsg('');
            const { data: { user } } = await supabaseBrowser.auth.getUser();
            if (!user) { setMsg('Önce giriş yapın'); return; }
            const { data, error } = await supabaseBrowser.rpc('create_invite', {
              p_project: projectId,
              p_actor: user.id,
              p_email: email,
              p_role: role
            });
            if (error) setMsg(error.message);
            else {
              const url = `${location.origin}/invites/${data}`;
              await navigator.clipboard.writeText(url).catch(() => {});
              setMsg('Davet oluşturuldu. Link panoya kopyalandı.');
            }
          }}
        >Gönder</button>
      </div>
      {msg ? <div className="text-sm text-green-300/80">{msg}</div> : null}
    </div>
  );
}


