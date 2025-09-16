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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-leaf-500 to-ocean-500 flex items-center justify-center shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" x2="8" y1="13" y2="13"/>
                  <line x1="16" x2="8" y1="17" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Proje Dokümanları</h1>
                <p className="text-white/60 text-base">Proje #{id} - Tüm teknik belgeler ve revizyon geçmişi</p>
              </div>
            </div>
            <Link 
              href={(`/projects/${id}` as unknown) as Route} 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-all text-white/80 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
              Projeye Dön
            </Link>
          </div>
        </div>

        {/* Upload Section */}
        <div className="glass-card p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14,2 14,8 20,8"/>
                <path d="M12 18v-6"/>
                <path d="m9 15 3-3 3 3"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Doküman Yükle</h2>
              <p className="text-white/60 text-sm">Yeni doküman ekleyin veya mevcut dokümana revizyon yükleyin</p>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-r from-leaf-500/10 to-ocean-500/10 border border-leaf-400/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-leaf-400/20 flex items-center justify-center mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-leaf-400">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                </div>
                <div className="text-white/80 text-sm">
                  <strong>Desteklenen Formatlar:</strong> PDF, Word, Excel, AutoCAD, Resimler
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-ocean-500/10 to-leaf-500/10 border border-ocean-400/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-ocean-400/20 flex items-center justify-center mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ocean-400">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <path d="M12 9v4"/>
                    <path d="m12 17 .01 0"/>
                  </svg>
                </div>
                <div className="text-white/80 text-sm">
                  <strong>Maksimum Boyut:</strong> 50MB dosya ve 500MB toplam proje limiti
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <ProjectDocumentUploader projectId={id} />
          </div>
        </div>

        {/* Documents List Section */}
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ocean-500/20 to-leaf-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ocean-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" x2="8" y1="13" y2="13"/>
                  <line x1="16" x2="8" y1="17" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Mevcut Dokümanlar</h2>
                <p className="text-white/60 text-sm">{docs?.length || 0} doküman mevcut</p>
              </div>
            </div>
            
            {/* Search */}
            <div className="w-80">
              <DocsSearchClient />
            </div>
          </div>

          {/* Documents Grid */}
          <div className="space-y-3">
            {(docs || []).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-600/20 to-slate-700/20 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                </div>
                <h3 className="text-white/60 font-medium mb-2">Henüz doküman yüklenmemiş</h3>
                <p className="text-white/40 text-sm">Yukarıdaki form ile ilk dokümanınızı yükleyebilirsiniz</p>
              </div>
            ) : (
              (docs || []).map((d: any) => {
                const lr = latestMap[d.id];
                return (
                  <DocsListRow key={d.id} doc={d} latest={lr} projectId={id} />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocsListRow({ doc, latest, projectId }: { doc: any, latest: any, projectId: string }) {
  const href = `/projects/${projectId}/documents/${doc.id}` as Route;
  const hay = `${doc.code} ${doc.name} ${latest?.mime || ''}`;
  
  const getFileIcon = (mime: string) => {
    if (mime?.startsWith('image/')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
      );
    } else if (mime === 'application/pdf') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" x2="8" y1="13" y2="13"/>
          <line x1="16" x2="8" y1="17" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      );
    } else if (mime?.includes('word') || mime?.includes('document')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" x2="8" y1="13" y2="13"/>
          <line x1="16" x2="8" y1="17" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      );
    } else if (mime?.includes('excel') || mime?.includes('sheet')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="8" x2="16" y1="13" y2="17"/>
          <line x1="8" x2="16" y1="17" y2="13"/>
        </svg>
      );
    } else {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
        </svg>
      );
    }
  };

  return (
    <div data-doc-row data-hay={hay} className="glass-card p-4 hover:border-white/20 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-white/5 to-white/10 border border-white/10">
            {latest?.mime ? getFileIcon(latest.mime) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <Link 
                href={href} 
                className="font-mono bg-gradient-to-r from-leaf-500/20 to-ocean-500/20 px-3 py-1 rounded-md text-sm font-medium hover:from-leaf-500/30 hover:to-ocean-500/30 transition-all border border-white/10"
              >
                {doc.code}
              </Link>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-xs font-medium">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-leaf-400">
                  <path d="M12 20v-6M6 20V10M18 20V4"/>
                </svg>
                Rev.{String(doc.current_revision).padStart(2, '0')}
              </span>
            </div>
            
            <Link href={href} className="text-white font-medium hover:text-leaf-300 transition-colors text-base block truncate">
              {doc.name}
            </Link>
            
            {latest?.note && (
              <p className="text-white/50 text-sm mt-1 italic truncate">
                "{latest.note.slice(0, 80)}{latest.note.length > 80 ? '…' : ''}"
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {latest ? (
            <>
              <a
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-all text-sm font-medium"
                href={`/api/documents/download?project=${projectId}&path=${encodeURIComponent(latest.file_path)}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
                İndir
              </a>
              {(latest.mime?.startsWith('image/') || latest.mime === 'application/pdf') && (
                <Link
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-leaf-400/20 bg-leaf-500/10 hover:bg-leaf-500/20 transition-all text-sm font-medium text-leaf-300"
                  href={`/projects/${projectId}/documents/${doc.id}` as Route}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Önizle
                </Link>
              )}
            </>
          ) : (
            <span className="text-white/40 text-sm px-3 py-2">Revizyon yok</span>
          )}
        </div>
      </div>
    </div>
  );
}
