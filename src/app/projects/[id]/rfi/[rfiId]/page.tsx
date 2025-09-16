import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { RfiPhotoUploader } from '@/components/RfiPhotoUploader';

export default async function RfiDetailPage({ params }: { params: { id: string; rfiId: string } }) {
  const { id, rfiId } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?error=login_required` as unknown) as Route);

  const { data: rfi, error } = await supabase
    .from('rfi')
    .select('*')
    .eq('project_id', id)
    .eq('id', rfiId)
    .maybeSingle();
  if (error) return <div>RFI yüklenemedi: {error.message}</div>;
  if (!rfi) return <div>RFI bulunamadı</div>;

  async function update(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const status = String(formData.get('status') || rfi.status);
    const answer_text = String(formData.get('answer_text') || '');
    const { error } = await supabase
      .from('rfi')
      .update({ status, answer_text, answered_at: status === 'answered' ? new Date().toISOString() : rfi.answered_at })
      .eq('id', rfiId)
      .eq('project_id', id);
    if (error) redirect((`/projects/${id}/rfi/${rfiId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/rfi` as unknown) as Route);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">RFI Detayı</h1>
        <div className="text-white/70 text-sm">Oluşturan: {rfi.created_by} • {new Date(rfi.created_at).toLocaleString()}</div>
      </div>

      <div className="glass rounded border border-white/10 p-4 space-y-3">
        <div>
          <div className="text-white/60 text-sm">Başlık</div>
          <div className="font-medium">{rfi.title}</div>
        </div>
        <div>
          <div className="text-white/60 text-sm">Açıklama</div>
          <div className="whitespace-pre-wrap">{rfi.description || '-'}</div>
        </div>
        <div className="flex gap-4">
          <div>
            <div className="text-white/60 text-sm">Durum</div>
            <div className="font-medium">{rfi.status}</div>
          </div>
          {rfi.due_date && (
            <div>
              <div className="text-white/60 text-sm">Termin</div>
              <div className="font-medium">{new Date(rfi.due_date).toLocaleDateString()}</div>
            </div>
          )}
        </div>
      </div>

      <form action={update} className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm mb-1">Durumu Güncelle</label>
          <select name="status" defaultValue={rfi.status} className="form-input">
            <option value="open">Açık</option>
            <option value="answered">Cevaplandı</option>
            <option value="closed">Kapalı</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Cevap</label>
          <textarea name="answer_text" defaultValue={rfi.answer_text || ''} className="form-input min-h-[120px]" />
        </div>
        <button type="submit" className="btn-primary">Kaydet</button>
      </form>

      <div className="space-y-3 max-w-xl">
        <div className="text-white/70">Fotoğraflar</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(Array.isArray(rfi.photos) ? rfi.photos : []).map((p: string) => (
            <div key={p} className="rounded overflow-hidden border border-white/10 bg-white/5 p-2 text-xs break-all">
              {p}
            </div>
          ))}
        </div>
        <RfiPhotoUploader projectId={id} rfiId={rfiId} />
      </div>
    </div>
  );
}
