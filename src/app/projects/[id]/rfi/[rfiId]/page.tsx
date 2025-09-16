import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { RfiPhotoUploader } from '@/components/RfiPhotoUploader';
import { RfiPhotoGrid } from '@/components/RfiPhotoGrid';

export default async function RfiDetailPage({ params }: { params: { id: string; rfiId: string } }) {
  const { id, rfiId } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?error=login_required` as unknown) as Route);

  const { data: rfi, error } = await supabase
    .from('rfi')
    .select('*, created_by')
    .eq('project_id', id)
    .eq('id', rfiId)
    .maybeSingle();
  const { data: messages } = await supabase
    .from('rfi_messages')
    .select('id, author_id, message, created_at')
    .eq('rfi_id', rfiId)
    .order('created_at', { ascending: true });

  async function postMessage(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const message = String(formData.get('message') || '').trim();
    if (!message) return;
    const { error } = await supabase.from('rfi_messages').insert({ rfi_id: rfiId, author_id: user!.id, message });
    if (error) redirect((`/projects/${id}/rfi/${rfiId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/rfi/${rfiId}` as unknown) as Route);
  }
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
        <RfiPhotoGrid keys={Array.isArray(rfi.photos) ? rfi.photos : []} projectId={id} rfiId={rfiId} />
        <RfiPhotoUploader projectId={id} rfiId={rfiId} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: info panel */}
        <div className="space-y-3">
          <div className="glass rounded border border-white/10 p-4">
            <div className="text-white/60 text-sm mb-1">Konu</div>
            <div className="font-medium">{rfi.title}</div>
          </div>
          {rfi.reference_text && (
            <div className="glass rounded border border-white/10 p-4">
              <div className="text-white/60 text-sm mb-1">Referanslar</div>
              <div>{rfi.reference_text}</div>
            </div>
          )}
        </div>

        {/* Right: message thread */}
        <div className="space-y-4">
          <div className="text-white/70">Yazışmalar</div>
          <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
            {(messages || []).map((m: any) => (
              <div key={m.id} className="glass rounded border border-white/10 p-3">
                <div className="text-xs text-white/60 mb-1">{m.author_id} • {new Date(m.created_at).toLocaleString()}</div>
                <div className="whitespace-pre-wrap">{m.message}</div>
              </div>
            ))}
            {(!messages || messages.length === 0) && (
              <div className="text-white/60">Henüz mesaj yok.</div>
            )}
          </div>
          <form action={postMessage} className="space-y-2">
            <textarea name="message" placeholder="Mesaj yazın..." className="form-input min-h-[80px]" />
            <button type="submit" className="btn-primary">Gönder</button>
          </form>
        </div>
      </div>
    </div>
  );
}
