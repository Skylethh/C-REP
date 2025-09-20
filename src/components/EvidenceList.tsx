"use client";
import { supabaseBrowser } from '@/lib/client';
import { deleteEvidence } from '@/app/projects/[id]/evidence/server';
import { useEffect, useState } from 'react';
import { Eye, Download, FileText, Image, File } from 'lucide-react';
import { Button } from './button';

export function EvidenceList({ projectId, items }: { projectId: string; items: { id: string; file_path: string; size: number; mime?: string; original_filename?: string }[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewingFile, setViewingFile] = useState<{ url: string; mime: string; name: string } | null>(null);
  
  useEffect(() => {
    (async () => {
      const next: Record<string, string> = {};
      for (const it of items) {
        const { data } = await supabaseBrowser.storage.from('evidence').createSignedUrl(it.file_path, 60);
        if (data?.signedUrl) next[it.id] = data.signedUrl;
      }
      setUrls(next);
    })();
  }, [items]);

  const getFileIcon = (mime?: string) => {
    if (mime?.startsWith('image/')) return <Image size={16} className="text-leaf-400" />;
    if (mime?.includes('pdf')) return <FileText size={16} className="text-red-400" />;
    return <File size={16} className="text-gray-400" />;
  };

  const getFileName = (filePath: string, originalFilename?: string) => {
    // Prefer original filename if available, otherwise extract from path
    if (originalFilename) return originalFilename;
    return filePath.split('/').pop() || filePath;
  };

  const handleView = (url: string, mime: string, fileName: string) => {
    if (mime?.startsWith('image/') || mime?.includes('pdf')) {
      setViewingFile({ url, mime, name: fileName });
    } else {
      // For other file types, open in new tab
      window.open(url, '_blank');
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };
  return (
    <>
      <ul className="space-y-2">
        {items.map((f) => {
          const fileName = getFileName(f.file_path, f.original_filename);
          const fileUrl = urls[f.id];
          
          return (
            <li key={f.id} className="rounded-lg border border-white/10 p-4 bg-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* File icon and thumbnail */}
                  <div className="flex-shrink-0">
                    {f.mime?.startsWith('image/') && fileUrl ? (
                      <img src={fileUrl} alt="thumbnail" className="h-12 w-12 object-cover rounded border border-white/20" />
                    ) : (
                      <div className="h-12 w-12 bg-white/10 rounded flex items-center justify-center">
                        {getFileIcon(f.mime)}
                      </div>
                    )}
                  </div>
                  
                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate" title={fileName}>
                      {fileName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                      <span>{Math.round(f.size/1024)} KB</span>
                      {f.mime && (
                        <>
                          <span>•</span>
                          <span>{f.mime.split('/')[1]?.toUpperCase()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {fileUrl && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(fileUrl, f.mime || '', fileName)}
                        className="h-8 px-3 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30"
                        title="Görüntüle"
                      >
                        <Eye size={14} className="text-leaf-400" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(fileUrl, fileName)}
                        className="h-8 px-3 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30"
                        title="İndir"
                      >
                        <Download size={14} className="text-ocean-400" />
                      </Button>
                    </>
                  )}
                  
                  <form action={deleteEvidence.bind(null, projectId)}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="file_path" value={f.file_path} />
                    <Button
                      size="sm"
                      variant="outline"
                      type="submit"
                      className="h-8 px-3 bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-400"
                      title="Sil"
                    >
                      Sil
                    </Button>
                  </form>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* File viewer modal */}
      {viewingFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 max-w-4xl max-h-[90vh] w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <h3 className="text-lg font-medium text-white truncate">
                {viewingFile.name}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(viewingFile.url, viewingFile.name)}
                  className="bg-white/5 border-white/20 hover:bg-white/10"
                >
                  <Download size={14} className="mr-1" />
                  İndir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingFile(null)}
                  className="bg-white/5 border-white/20 hover:bg-white/10"
                >
                  Kapat
                </Button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 max-h-[calc(90vh-120px)] overflow-auto">
              {viewingFile.mime?.startsWith('image/') ? (
                <img 
                  src={viewingFile.url} 
                  alt={viewingFile.name}
                  className="max-w-full h-auto mx-auto rounded"
                />
              ) : viewingFile.mime?.includes('pdf') ? (
                <iframe
                  src={viewingFile.url}
                  className="w-full h-[70vh] rounded border border-white/20"
                  title={viewingFile.name}
                />
              ) : (
                <div className="text-center py-8 text-white/60">
                  <File size={48} className="mx-auto mb-4" />
                  <p>Bu dosya türü önizlenemiyor.</p>
                  <Button
                    onClick={() => window.open(viewingFile.url, '_blank')}
                    className="mt-4 bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500"
                  >
                    Yeni sekmede aç
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


