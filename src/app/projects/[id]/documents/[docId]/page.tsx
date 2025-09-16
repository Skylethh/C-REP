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

export default async function DocumentDetailPage({ params, searchParams }: { params: { id: string, docId: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
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

  // Flash messages via query params
  const flashError = typeof searchParams?.error === 'string' ? decodeURIComponent(searchParams!.error) : '';
  const flashSuccess = typeof searchParams?.success === 'string' ? decodeURIComponent(searchParams!.success) : '';

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
    // Ensure unique per project
    const { data: docRow } = await supabase.from('documents').select('project_id').eq('id', docId).single();
    if (!docRow) redirect((`/projects/${projectId}/documents/${docId}?error=${encodeURIComponent('Doküman bulunamadı')}` as unknown) as Route);
    const { data: exists } = await supabase
      .from('documents')
      .select('id')
      .eq('project_id', docRow.project_id)
      .eq('code', code)
      .neq('id', docId)
      .limit(1);
    if (exists && exists.length > 0) {
      redirect((`/projects/${projectId}/documents/${docId}?error=${encodeURIComponent('Bu kod bu projede zaten kullanılıyor. Lütfen farklı bir kod deneyin.')}` as unknown) as Route);
    }
    const { error: updErr } = await supabase.from('documents').update({ code }).eq('id', docId);
    if (updErr) {
      // Fallback: unique violation or other error
      const msg = updErr.code === '23505'
        ? 'Bu kod bu projede zaten kullanılıyor. Lütfen farklı bir kod deneyin.'
        : 'Kod güncellenirken hata oluştu.';
      redirect((`/projects/${projectId}/documents/${docId}?error=${encodeURIComponent(msg)}` as unknown) as Route);
    }
    revalidatePath(`/projects/${projectId}/documents/${docId}`);
    redirect((`/projects/${projectId}/documents/${docId}?success=${encodeURIComponent('Kod güncellendi.')}` as unknown) as Route);
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
    // Get file_path for storage cleanup before deleting
    const { data: revRow } = await supabase
      .from('document_revisions')
      .select('file_path')
      .eq('document_id', docId)
      .eq('rev_no', rev)
      .single();
    await supabase.from('document_revisions').delete().eq('document_id', docId).eq('rev_no', rev);
    // Best-effort: remove file from Storage
    try {
      if (revRow?.file_path) {
        const storageKey = revRow.file_path.replace(/^project-files\//, '');
        await supabase.storage.from('project-files').remove([storageKey]);
      }
      revalidatePath(`/projects/${projectId}/documents/${docId}`);
      redirect((`/projects/${projectId}/documents/${docId}?success=${encodeURIComponent('Revizyon silindi.')}` as unknown) as Route);
    } catch (e) {
      // ignore storage errors; DB delete already happened
      revalidatePath(`/projects/${projectId}/documents/${docId}`);
      redirect((`/projects/${projectId}/documents/${docId}?error=${encodeURIComponent('Revizyon verisi silindi ancak dosya kaldırılamadı.')}` as unknown) as Route);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {(flashError || flashSuccess) && (
        <div className={`rounded border px-3 py-2 text-sm ${flashError ? 'border-red-500/40 text-red-300 bg-red-500/10' : 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'}`}>
          {flashError || flashSuccess}
        </div>
      )}
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
