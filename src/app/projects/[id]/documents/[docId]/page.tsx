import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { Route } from 'next';
import Link from 'next/link';

async function getSignedUrl(supabase: any, projectId: string, path: string) {
  const { data: revRows, error: revErr } = await supabase
    .from('document_revisions')
    .select('id, file_path, documents!inner(project_id)')
    .eq('file_path', path)
    .eq('documents.project_id', projectId)
    .limit(1);
  if (revErr || !revRows?.length) return null;
  const storageKey = path.replace(/^project-files\//, '');
  const { data } = await supabase.storage.from('project-files').createSignedUrl(storageKey, 60 * 5);
  return data?.signedUrl || null;
}

export default async function DocumentDetailPage({ params }: { params: { id: string, docId: string } }) {
  const projectId = params.id;
  const docId = params.docId;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?error=login_required` as unknown) as Route);

  // Fetch document and all revisions
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, project_id, code, name, current_revision')
    .eq('id', docId)
    .single();
  if (docErr || !doc) return <div>Doküman bulunamadı</div>;

  const { data: revs, error: revErr } = await supabase
    .from('document_revisions')
    .select('id, rev_no, file_path, mime, size, note, created_at, created_by')
    .eq('document_id', docId)
    .order('rev_no', { ascending: false });
  if (revErr) return <div>Revizyonlar yüklenemedi: {revErr.message}</div>;

  async function renameAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '').trim();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Ensure editor
    const { data: d } = await supabase.from('documents').select('id').eq('id', docId).single();
    if (!d) return;
    await supabase.from('documents').update({ name }).eq('id', docId);
    revalidatePath(`/projects/${projectId}/documents/${docId}`);
  }

  async function renameCodeAction(formData: FormData) {
    'use server';
    const code = String(formData.get('code') || '').trim();
    if (!code) return;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('documents').update({ code }).eq('id', docId);
    revalidatePath(`/projects/${projectId}/documents/${docId}`);
  }

  async function revertAction(formData: FormData) {
    'use server';
    const rev = Number(formData.get('rev'));
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.rpc('set_document_current_revision', { p_document: docId, p_rev: rev, p_actor: user.id });
    if (error) console.error(error);
    revalidatePath(`/projects/${projectId}/documents/${docId}`);
  }

  async function deleteAction() {
    'use server';
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('documents').delete().eq('id', docId);
    redirect((`/projects/${projectId}/documents` as unknown) as Route);
  }

  async function deleteRevisionAction(formData: FormData) {
    'use server';
    const rev = Number(formData.get('rev'));
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Ensure not current revision
    const { data: d } = await supabase.from('documents').select('current_revision').eq('id', docId).single();
    if (!d || d.current_revision === rev) return;
    await supabase.from('document_revisions').delete().eq('document_id', docId).eq('rev_no', rev);
    revalidatePath(`/projects/${projectId}/documents/${docId}`);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white/70 text-xs mb-1">Proje #{projectId}</div>
          <h1 className="text-xl font-semibold">{doc.code} – {doc.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={( `/projects/${projectId}/documents` as unknown) as Route} className="px-3 py-1.5 rounded border border-white/10 bg-white/10">← Liste</Link>
          <form action={deleteAction}>
            <button className="px-3 py-1.5 rounded border border-red-500/40 text-red-300 hover:bg-red-500/10">Sil</button>
          </form>
        </div>
      </div>

      <div className="glass rounded border border-white/10 p-4 space-y-4">
        <div>
          <div className="font-medium">Adı Değiştir</div>
          <form action={renameAction} className="flex items-center gap-2 mt-2">
            <input name="name" defaultValue={doc.name} className="form-input w-full max-w-md" />
            <button className="btn-primary">Kaydet</button>
          </form>
        </div>
        <div>
          <div className="font-medium">Kodu Değiştir</div>
          <form action={renameCodeAction} className="flex items-center gap-2 mt-2">
            <input name="code" defaultValue={doc.code} className="form-input w-full max-w-md" />
            <button className="px-3 py-1.5 rounded border border-white/10 bg-white/10 hover:bg-white/20">Kodu Kaydet</button>
          </form>
          <div className="text-xs text-white/60 mt-1">Not: Mevcut dosyalar eski klasörde kalır; yeni yüklemeler yeni kod klasörüne gidecek.</div>
        </div>
      </div>

      <div className="glass rounded border border-white/10 p-4">
        <div className="font-medium mb-2">Revizyonlar</div>
        <div className="space-y-2">
          {(revs || []).map(async (r) => {
            const download = `/api/documents/download?project=${projectId}&path=${encodeURIComponent(r.file_path)}`;
            const isCurrent = r.rev_no === doc.current_revision;
            const canPreview = r.mime?.startsWith('image/') || r.mime === 'application/pdf';
            const signed = canPreview ? await getSignedUrl(supabase, projectId, r.file_path) : null;
            return (
              <div key={r.id} className="rounded border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded mr-2">Rev.{String(r.rev_no).padStart(2, '0')}</span>
                    <span className="text-white/70">{new Date(r.created_at).toLocaleString()}</span>
                    {r.note && <span className="ml-2 text-white/60 italic">“{r.note}”</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <a className="px-2 py-1 rounded border border-white/10 bg-white/10 hover:bg-white/20" href={download}>İndir</a>
                    {!isCurrent && (
                      <form action={revertAction}>
                        <input type="hidden" name="rev" value={r.rev_no} />
                        <button className="px-2 py-1 rounded border border-white/10 hover:bg-white/10">Bu sürümü kullan</button>
                      </form>
                    )}
                    {!isCurrent && (
                      <form action={deleteRevisionAction}>
                        <input type="hidden" name="rev" value={r.rev_no} />
                        <button className="px-2 py-1 rounded border border-red-500/40 text-red-300 hover:bg-red-500/10">Sil</button>
                      </form>
                    )}
                    {isCurrent && <span className="text-emerald-300">(Aktif)</span>}
                  </div>
                </div>
                {canPreview && signed && (
                  <div className="mt-3">
                    {r.mime?.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={signed} alt={`Rev ${r.rev_no}`} className="max-h-96 rounded border border-white/10" />
                    ) : (
                      <iframe src={signed} className="w-full h-96 rounded border border-white/10" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
