import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import { ProjectDocumentUploader } from '../../../../components/ProjectDocumentUploader';
import { DocsSearchClient } from '../../../../components/DocsSearchClient';

export default async function ProjectDocumentsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?error=login_required` as unknown) as Route);

  // List documents with latest revision info
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, code, name, current_revision')
    .eq('project_id', id)
    .order('code');
  if (error) return <div>Dokümanlar yüklenemedi: {error.message}</div>;

  // Fetch recent revisions per document (latest 1)
  async function latestRev(documentId: string) {
    const { data } = await supabase
      .from('document_revisions')
      .select('id, rev_no, file_path, mime, note, created_at')
      .eq('document_id', documentId)
      .order('rev_no', { ascending: false })
      .limit(1);
    return data?.[0] || null;
  }

  const latestMap: Record<string, any> = {};
  for (const d of docs || []) {
    latestMap[d.id] = await latestRev(d.id);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dokümanlar</h1>
          <div className="text-white/70 text-sm">Proje #{id}</div>
        </div>
        <Link href={( `/projects/${id}` as unknown) as Route} className="px-3 py-1.5 rounded border border-white/10 bg-white/10">← Proje</Link>
      </div>

      <div className="glass rounded border border-white/10 p-4">
        <div className="font-medium mb-2">Yeni/Revizyon Yükle</div>
        <ProjectDocumentUploader projectId={id} />
      </div>

      <div className="glass rounded border border-white/10 p-4">
        <div className="font-medium mb-3">Mevcut Dokümanlar</div>
        <DocsSearchClient />
        <div className="space-y-2">
          {(docs || []).length === 0 && (
            <div className="text-white/60 text-sm">Henüz doküman yok.</div>
          )}
          {(docs || []).map((d: any) => {
            const lr = latestMap[d.id];
            return (
              <DocsListRow key={d.id} doc={d} latest={lr} projectId={id} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DocsListRow({ doc, latest, projectId }: { doc: any, latest: any, projectId: string }) {
  const href = `/projects/${projectId}/documents/${doc.id}` as Route;
  const hay = `${doc.code} ${doc.name} ${latest?.mime || ''}`;
  return (
    <div data-doc-row data-hay={hay} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-sm">
        <Link href={href} className="font-mono bg-white/10 px-1.5 py-0.5 rounded mr-2 hover:bg-white/20">{doc.code}</Link>
        <Link href={href} className="font-medium hover:underline">{doc.name}</Link>
        <span className="text-white/60 ml-2">Rev.{String(doc.current_revision).padStart(2, '0')}</span>
        {latest?.note && <span className="ml-2 text-white/50 italic">“{latest.note.slice(0, 60)}{latest.note.length > 60 ? '…' : ''}”</span>}
      </div>
      <div className="flex items-center gap-2 text-xs">
        {latest ? (
          <>
            <a
              className="px-2 py-1 rounded border border-white/10 bg-white/10 hover:bg-white/20"
              href={`/api/documents/download?project=${projectId}&path=${encodeURIComponent(latest.file_path)}`}
            >
              İndir
            </a>
            {(latest.mime?.startsWith('image/') || latest.mime === 'application/pdf') && (
              <a
                className="px-2 py-1 rounded border border-white/10 bg-white/10 hover:bg-white/20"
                href={`/projects/${projectId}/documents/${doc.id}` as Route}
              >
                Önizle
              </a>
            )}
          </>
        ) : (
          <span className="text-white/50">Revizyon yok</span>
        )}
      </div>
    </div>
  );
}
