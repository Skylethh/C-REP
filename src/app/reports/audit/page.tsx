import { createClient } from '@/lib/server';

type AuditRow = {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  metadata: any;
  created_at: string;
};

export default async function AuditReportPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) || {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div>Devam etmek için giriş yapın.</div>;
  }

  const projectId = typeof sp.project === 'string' ? sp.project : '';
  const action = typeof sp.action === 'string' ? sp.action : '';
  const resource = typeof sp.resource === 'string' ? sp.resource : '';
  const limit = Math.min(Number(sp.limit || 50), 200) || 50;

  let query = supabase
    .from('audit_logs')
    .select('id, user_id, action, resource, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (projectId) (query as any).contains('metadata', { project_id: projectId });
  if (action) query.eq('action', action);
  if (resource) query.eq('resource', resource);

  const { data, error } = await query as unknown as { data: AuditRow[] | null; error: any };
  if (error) {
    return <div>Audit kayıtları yüklenemedi: {String(error.message || error)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Denetim Kaydı</h1>
        <p className="text-white/70 text-sm">İşlem geçmişi (güncelden eskiye)</p>
      </div>

      <form className="flex flex-wrap gap-2 items-end bg-white/5 border border-white/10 p-3 rounded-md">
        <div className="flex flex-col">
          <label className="text-xs text-white/60">Proje ID</label>
          <input name="project" defaultValue={projectId} placeholder="proj-uuid" className="form-input py-1.5" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-white/60">Kaynak (resource)</label>
          <input name="resource" defaultValue={resource} placeholder="entries/evidence_files/project_members" className="form-input py-1.5" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-white/60">İşlem</label>
          <select name="action" defaultValue={action} className="form-input py-1.5">
            <option value="">Hepsi</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-white/60">Limit</label>
          <select name="limit" defaultValue={String(limit)} className="form-input py-1.5">
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12"></polyline>
          </svg>
          Uygula
        </button>
      </form>

      <div className="rounded-md border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left p-2">Tarih</th>
              <th className="text-left p-2">Kullanıcı</th>
              <th className="text-left p-2">İşlem</th>
              <th className="text-left p-2">Kaynak</th>
              <th className="text-left p-2">Proje</th>
              <th className="text-left p-2">Özet</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((row) => {
              const proj = row.metadata?.project_id || '-';
              const summary = row.action === 'INSERT' ? row.metadata?.new : row.action === 'DELETE' ? row.metadata?.old : { before: row.metadata?.old, after: row.metadata?.new };
              return (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="p-2 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="p-2 text-white/70">{row.user_id?.slice(0, 8)}…</td>
                  <td className="p-2 font-medium">{row.action}</td>
                  <td className="p-2">{row.resource}</td>
                  <td className="p-2">{proj}</td>
                  <td className="p-2 max-w-[480px]">
                    <pre className="whitespace-pre-wrap text-xs text-white/70">{JSON.stringify(summary, null, 2)}</pre>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


