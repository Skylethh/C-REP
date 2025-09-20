import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { RfiPhotoUploader } from '@/components/RfiPhotoUploader';
import { RfiPhotoList } from '@/components/RfiPhotoList';

export default async function RfiDetailPage(props: { params: Promise<{ id: string; rfiId: string }> }) {
  const { id, rfiId } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?error=login_required` as unknown) as Route);

  const { data: rfi, error } = await supabase
    .from('rfi')
    .select('*, created_by')
    .eq('project_id', id)
    .eq('id', rfiId)
    .maybeSingle();
  // Mesajlaşma kutusu kaldırıldı – mesaj akışı ve gönderim formu devre dışı.
  if (error) return <div>RFI yüklenemedi: {error.message}</div>;
  if (!rfi) return <div>RFI bulunamadı</div>;

  // Fetch responses for this RFI
  const { data: responsesRaw } = await supabase
    .from('rfi_responses')
    .select('*')
    .eq('rfi_id', rfiId)
    .order('created_at', { ascending: true });
  const responses = Array.isArray(responsesRaw) ? responsesRaw : [];

  // Fetch project members to map user_id -> email/role and determine editor privileges
  const { data: members } = await supabase.rpc('get_project_members', { p_project: id });
  const memberMap = new Map<string, { email?: string; role?: string }>();
  (members || []).forEach((m: any) => memberMap.set(m.user_id, { email: m.email, role: m.role }));
  const meRole = memberMap.get(user.id)?.role;
  const isEditor = meRole === 'owner' || meRole === 'editor';
  const emailToName = (email?: string) => (email || '').split('@')[0] || 'kullanıcı';

  async function update(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const status = String(formData.get('status') || rfi.status);
    const patch: any = { status, answered_at: status === 'answered' ? new Date().toISOString() : rfi.answered_at };
    if (formData.has('answer_text')) {
      patch.answer_text = String(formData.get('answer_text') || '');
    }
    const { error } = await supabase
      .from('rfi')
      .update(patch)
      .eq('id', rfiId)
      .eq('project_id', id);
    if (error) redirect((`/projects/${id}/rfi/${rfiId}?error=${encodeURIComponent(error.message)}` as unknown) as Route);
    redirect((`/projects/${id}/rfi` as unknown) as Route);
  }

  // Add a new response to the thread and mark as answered when applicable
  async function postResponse(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const body = String(formData.get('body') || '').trim();
    if (!body) {
      redirect((`/projects/${id}/rfi/${rfiId}?error=${encodeURIComponent('Cevap metni boş olamaz')}` as unknown) as Route);
    }
    const { error: insErr } = await supabase
      .from('rfi_responses')
      .insert({ rfi_id: rfiId, body, created_by: (await supabase.auth.getUser()).data.user?.id });
    if (insErr) {
      redirect((`/projects/${id}/rfi/${rfiId}?error=${encodeURIComponent(insErr.message)}` as unknown) as Route);
    }
    // If RFI is open, mark it as answered and set answered_at if not set
    if (rfi.status === 'open') {
      const { error: updErr } = await supabase
        .from('rfi')
        .update({ status: 'answered', answered_at: rfi.answered_at ?? new Date().toISOString() })
        .eq('id', rfiId)
        .eq('project_id', id);
      if (updErr) {
        redirect((`/projects/${id}/rfi/${rfiId}?error=${encodeURIComponent(updErr.message)}` as unknown) as Route);
      }
    }
    redirect((`/projects/${id}/rfi/${rfiId}` as unknown) as Route);
  }

  // Edit an existing response (only by creator or project editor/owner)
  async function updateResponse(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const responseId = String(formData.get('response_id') || '');
    const body = String(formData.get('body') || '').trim();
    if (!responseId || !body) {
      redirect((`/projects/${id}/rfi/${rfiId}?error=${encodeURIComponent('Geçersiz veri')}` as unknown) as Route);
    }
    const { error: updErr } = await supabase
      .from('rfi_responses')
      .update({ body })
      .eq('id', responseId)
      .eq('rfi_id', rfiId);
    if (updErr) {
      redirect((`/projects/${id}/rfi/${rfiId}?error=${encodeURIComponent(updErr.message)}` as unknown) as Route);
    }
    redirect((`/projects/${id}/rfi/${rfiId}` as unknown) as Route);
  }

  // Delete a response
  async function deleteResponse(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const responseId = String(formData.get('response_id') || '');
    if (!responseId) {
      redirect((`/projects/${id}/rfi/${rfiId}?error=${encodeURIComponent('Geçersiz veri')}` as unknown) as Route);
    }
    const { error: delErr } = await supabase
      .from('rfi_responses')
      .delete()
      .eq('id', responseId)
      .eq('rfi_id', rfiId);
    if (delErr) {
      redirect((`/projects/${id}/rfi/${rfiId}?error=${encodeURIComponent(delErr.message)}` as unknown) as Route);
    }
    redirect((`/projects/${id}/rfi/${rfiId}` as unknown) as Route);
  }

  const statusConfig = {
    open: { 
      label: 'Açık',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: 'M8 12h8M12 8v8'
    },
    answered: { 
      label: 'Cevaplandı',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: 'M20 6L9 17l-5-5'
    },
    closed: { 
      label: 'Kapalı',
      badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      icon: 'M6 18L18 6M6 6l12 12'
    }
  };

  const currentStatus = statusConfig[rfi.status as keyof typeof statusConfig] || statusConfig.open;

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Hero Header Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/80 to-ocean-900/80 border border-white/10 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 backdrop-blur-sm"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-30"></div>
          
          <div className="relative p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10 shadow-glow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold highlight-text tracking-tight">RFI Detayı & Cevaplama</h1>
                  <div className="mt-1 text-white/70">
                    {/* RFI No (proje bazlı sıra) */}
                    {typeof rfi.rfi_index === 'number' && (
                      <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-white/5 border border-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 2v6h6" />
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        </svg>
                        RFI No: {String(rfi.rfi_index).padStart(3, '0')}
                      </span>
                    )}
                  </div>
                  <p className="text-white/70 mt-2">Request for Information - Bilgi Talebi Yönetimi</p>
                  <div className="flex items-center gap-2 mt-3 text-sm text-white/60">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Oluşturan: {emailToName(memberMap.get(rfi.created_by)?.email)}</span>
                    <span className="text-white/40">•</span>
                    <span>{new Date(rfi.created_at).toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-3">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${currentStatus.badge}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={currentStatus.icon} />
                    </svg>
                    <span>{currentStatus.label}</span>
                  </div>
                  {/* Compact status update (creator or editor) */}
                  {(user.id === rfi.created_by || isEditor) && (
                    <form action={update} className="inline-flex items-center gap-2">
                      <select name="status" defaultValue={rfi.status} className="form-input h-9">
                        <option value="open">Açık</option>
                        <option value="answered">Cevaplandı</option>
                        <option value="closed">Kapalı</option>
                      </select>
                      <button type="submit" className="btn-secondary h-9 px-3 text-sm">Güncelle</button>
                    </form>
                  )}
                </div>
                {rfi.due_date && (
                  <div className="text-sm text-white/60">
                    <span>Termin: </span>
                    <span className="font-medium text-white/80">{new Date(rfi.due_date).toLocaleDateString('tr-TR')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - RFI Information */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* RFI Details Card */}
            <div className="glass-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white/90">RFI Bilgileri</h2>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Başlık</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 font-medium text-white/90">
                      {rfi.title}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Durum</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium ${currentStatus.badge}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={currentStatus.icon} />
                        </svg>
                        {currentStatus.label}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="form-label">Açıklama</label>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="whitespace-pre-wrap text-white/90 leading-relaxed">
                      {rfi.description || <span className="text-white/50 italic">Açıklama bulunmuyor</span>}
                    </div>
                  </div>
                </div>
                
                {rfi.reference_text && (
                  <div>
                    <label className="form-label">Proje Referansları</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="whitespace-pre-wrap text-white/90">
                        {rfi.reference_text}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Responses thread (single, with reply composer) */}
            <div className="glass-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-ocean-500/20 to-leaf-500/20 border border-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ocean-400">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M8 10h8M8 14h6" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white/90">Cevaplar</h2>
              </div>

              {/* Composer on top (disabled when closed) */}
              <form action={postResponse} className="space-y-3 mb-6">
                <label className="form-label">Yeni Cevap</label>
                <textarea 
                  name="body" 
                  placeholder={rfi.status==='closed' ? 'RFI kapalı, yeni cevap eklenemez' : 'RFI yanıtınızı yazın...'} 
                  className="form-input w-full min-h-[100px]"
                  disabled={rfi.status==='closed'}
                />
                <div className="flex justify-between text-xs text-white/60">
                  <div className="bg-white/5 border border-white/10 rounded px-2 py-1">
                    Durum "Açık" ise cevap eklemek otomatik olarak "Cevaplandı" yapar.
                  </div>
                  <button type="submit" className="btn-secondary px-4 py-2 disabled:opacity-50" disabled={rfi.status==='closed'}>Cevap Ekle</button>
                </div>
              </form>

              {/* Existing replies */}
              <div className="space-y-4">
                {responses.length === 0 && (
                  <div className="text-sm text-white/60">Henüz cevap yok.</div>
                )}
                {responses.map((resp: any, idx: number) => {
                  const creator = memberMap.get(resp.created_by);
                  const canModify = isEditor || resp.created_by === user.id;
                  const initials = (emailToName(creator?.email) || 'U').slice(0,2).toUpperCase();
                  return (
                    <div key={resp.id || idx} className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[10px] text-white/80">{initials}</div>
                          <span>{emailToName(creator?.email)}</span>
                          {creator?.role && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] uppercase tracking-wide">{creator.role}</span>
                          )}
                        </div>
                        <span>{new Date(resp.created_at).toLocaleString('tr-TR')}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-white/90 leading-relaxed mb-3">{resp.body}</div>
                      {canModify && (
                        <div className="flex items-center gap-3">
                          <form action={updateResponse} className="flex-1 flex items-center gap-2">
                            <input type="hidden" name="response_id" value={resp.id} />
                            <textarea name="body" defaultValue={resp.body} className="form-input flex-1 min-h-[60px]" />
                            <button type="submit" className="btn-secondary px-3 py-1 text-xs">Güncelle</button>
                          </form>
                          <form action={deleteResponse}>
                            <input type="hidden" name="response_id" value={resp.id} />
                            <button type="submit" className="text-red-300 hover:text-red-200 text-xs underline">Sil</button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            
          </div>

          {/* Right Column - Photos */}
          <div className="lg:col-span-1">
            <div className="glass-card h-fit">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white/90">
                  Ekler & Fotoğraflar
                  {user.id === rfi.created_by && (
                    <span className="ml-2 text-xs text-leaf-400 bg-leaf-500/10 px-2 py-1 rounded-lg border border-leaf-500/20">
                      Düzenleme İzni
                    </span>
                  )}
                </h2>
              </div>
              
              <div className="space-y-4">
                <RfiPhotoList 
                  keys={Array.isArray(rfi.photos) ? rfi.photos : []} 
                  projectId={id} 
                  rfiId={rfiId} 
                  canDelete={user.id === rfi.created_by}
                />
                <div className="border-t border-white/10 pt-4">
                  <RfiPhotoUploader projectId={id} rfiId={rfiId} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
