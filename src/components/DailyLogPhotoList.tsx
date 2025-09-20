"use client";

import { supabaseBrowser } from '@/lib/client';
import { useEffect, useState } from 'react';
import { Eye, Download, Image, File } from 'lucide-react';
import { Button } from './button';

interface PhotoItem {
  path: string;
  original_name: string;
}

// Support both old string[] format and new PhotoItem[] format
type PhotoData = string | PhotoItem;

// Utility functions to handle both formats
const getPhotoPath = (photo: PhotoData): string => {
  return typeof photo === 'string' ? photo : photo.path;
};

const getPhotoName = (photo: PhotoData): string => {
  if (typeof photo === 'string') {
    // Extract filename from path for string format
    const fileName = photo.split('/').pop() || photo;
    return fileName;
  }
  return photo.original_name;
};

const normalizeKey = (key: string) => key.replace(/^project-files\//, '');

export function DailyLogPhotoList({ projectId, logId, photos }: { projectId: string; logId: string; photos: PhotoData[] }) {
  // Keep a local copy so we can update UI without a full page reload
  const [items, setItems] = useState<PhotoData[]>(photos);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // Sync when props change (e.g., parent refresh)
  useEffect(() => {
    setItems(photos);
  }, [photos]);

  useEffect(() => {
    async function fetchUrls() {
      const client = supabaseBrowser;
      const newUrls: Record<string, string> = {};
      
      console.log('🔍 Fetching URLs for photos:', items);
      
      for (const photo of items) {
        const photoPath = getPhotoPath(photo);
        const cleanPath = normalizeKey(photoPath);
        console.log('🔍 Processing photo:', { photoPath, cleanPath });
        
        const { data, error } = await client.storage.from('project-files').createSignedUrl(cleanPath, 3600);
        console.log('🔍 Supabase response:', { data, error });
        
        if (data?.signedUrl) {
          newUrls[photoPath] = data.signedUrl;
          console.log('✅ URL created for:', photoPath);
        } else {
          console.log('❌ No URL for:', photoPath, error);
        }
      }
      
      console.log('🔍 Final URLs:', newUrls);
      setUrls(newUrls);
      setLoading(false);
    }

    if (items.length > 0) {
      fetchUrls();
    } else {
      setLoading(false);
    }
  }, [items]);

  const handleView = (url: string, fileName: string) => {
    if (!url) return alert('Fotoğraf önizlemesi için URL bulunamadı');
    setViewingPhoto({ url, name: fileName });
  };

  const handleDownload = async (url: string, fileName: string) => {
    if (!url) return alert('İndirme için URL bulunamadı');
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

  const handleDelete = async (photoPath: string) => {
    try {
      const client = supabaseBrowser;

      // Optimistic UI update
      const prevItems = items;
      const prevUrls = urls;
      const updatedItems = prevItems.filter(p => getPhotoPath(p) !== photoPath);
      const updatedUrls = { ...prevUrls } as Record<string, string>;
      delete updatedUrls[photoPath];

      setDeleting((d) => ({ ...d, [photoPath]: true }));
      setItems(updatedItems);
      setUrls(updatedUrls);
      if (viewingPhoto && urls[photoPath] === viewingPhoto.url) {
        setViewingPhoto(null);
      }

      // Remove from storage
      const cleanPath = normalizeKey(photoPath);
      const { error: storageError } = await client.storage.from('project-files').remove([cleanPath]);
      if (storageError) throw storageError;

      // Persist DB change
      const { error } = await client
        .from('daily_logs')
        .update({ photos: updatedItems })
        .eq('id', logId);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Fotoğraf silinirken bir hata oluştu');
      // Revert UI on failure
      setItems(photos);
      // Refetch URLs to be safe
      setLoading(true);
      setUrls({});
    }
    finally {
      setDeleting((d) => ({ ...d, [photoPath]: false }));
    }
  };

  if (loading) {
    return <div className="text-white/70">Fotoğraflar yükleniyor...</div>;
  }

  if (items.length === 0) {
    return <div className="text-white/70">Henüz fotoğraf eklenmemiş</div>;
  }

  // Sort photos by name to avoid mixed ordering
  const sortedPhotos = [...items].sort((a, b) => getPhotoName(a).localeCompare(getPhotoName(b)));

  return (
    <>
      <ul className="space-y-2">
        {sortedPhotos.map((photo, index) => {
          const photoPath = getPhotoPath(photo);
          const photoName = getPhotoName(photo);
          const fileUrl = urls[photoPath];
          
          return (
            <li key={photoPath + index} className="rounded-lg border border-white/10 p-4 bg-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Photo thumbnail */}
                  <div className="flex-shrink-0">
                    {fileUrl ? (
                      <img src={fileUrl} alt="thumbnail" className="h-12 w-12 object-cover rounded border border-white/20" />
                    ) : (
                      <div className="h-12 w-12 bg-white/10 rounded flex items-center justify-center">
                        <Image size={16} className="text-leaf-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Photo info */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate" title={photoName}>
                      {photoName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                      <span>Fotoğraf</span>
                      <span>•</span>
                      <span>JPG</span>
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
                        onClick={() => handleView(fileUrl, photoName)}
                        className="h-8 px-3 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30"
                        title="Görüntüle"
                      >
                        <Eye size={14} className="text-leaf-400" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(fileUrl, photoName)}
                        className="h-8 px-3 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30"
                        title="İndir"
                      >
                        <Download size={14} className="text-ocean-400" />
                      </Button>
                    </>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(photoPath)}
                    disabled={!!deleting[photoPath]}
                    className="h-8 px-3 bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-400"
                    title="Sil"
                  >
                    {deleting[photoPath] ? 'Siliniyor…' : 'Sil'}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Photo viewer modal - Same as Evidence system */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 max-w-4xl max-h-[90vh] w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <h3 className="text-lg font-medium text-white truncate">
                {viewingPhoto.name}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(viewingPhoto.url, viewingPhoto.name)}
                  className="bg-white/5 border-white/20 hover:bg-white/10"
                >
                  <Download size={14} className="mr-1" />
                  İndir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingPhoto(null)}
                  className="bg-white/5 border-white/20 hover:bg-white/10"
                >
                  Kapat
                </Button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 max-h-[calc(90vh-120px)] overflow-auto">
              <img 
                src={viewingPhoto.url} 
                alt={viewingPhoto.name}
                className="max-w-full h-auto mx-auto rounded"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}