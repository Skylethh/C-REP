import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';

export default async function NewRfiPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?error=login_required` as unknown) as Route);

  async function create(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '');
    const to_role = String(formData.get('to_role') || '').trim() || null;
    const due_date_raw = String(formData.get('due_date') || '').trim();
    const due_date = due_date_raw ? due_date_raw : null;
    const from_party = String(formData.get('from_party') || '').trim() || 'Biz';
    const reference_text = String(formData.get('reference_text') || '').trim() || null;
  if (!title) redirect((`/projects/${id}/rfi/new?error=missing_title` as unknown) as Route);
    const { error, data } = await supabase.rpc('create_rfi', {
      p_project: id,
      p_actor: user!.id,
      p_title: title,
      p_description: description,
      p_to_role: to_role,
      p_due_date: due_date,
      p_from_party: from_party,
      p_reference_text: reference_text,
    });
  if (error) redirect((`/projects/${id}/rfi/new?error=${encodeURIComponent(error.message)}` as unknown) as Route);
  redirect((`/projects/${id}/rfi` as unknown) as Route);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="glass-card p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-leaf-500 to-ocean-500 flex items-center justify-center shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Yeni RFI Oluştur</h1>
              <p className="text-white/60 text-base mt-1">Proje ile ilgili bilgi talep formunuzu oluşturun ve ilgili taraflara gönderin</p>
            </div>
          </div>
          
          {/* Info Card */}
          <div className="bg-gradient-to-r from-leaf-500/10 to-ocean-500/10 border border-leaf-400/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-leaf-400/20 flex items-center justify-center mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-leaf-400">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
              </div>
              <div className="text-white/80 text-sm">
                <strong>RFI (Request for Information)</strong> formu, proje sürecinde karşılaşılan belirsizlikleri çözmek ve detaylı bilgi almak için kullanılır.
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="glass-card p-8">
          <form action={create} className="space-y-8">
            {/* Title Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white font-semibold text-sm">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-leaf-400/20 to-ocean-400/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-leaf-400">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <path d="M14 2v6h6"/>
                    <path d="M16 13H8"/>
                    <path d="M16 17H8"/>
                  </svg>
                </div>
                Başlık <span className="text-red-400">*</span>
              </label>
              <input 
                type="text" 
                name="title" 
                required 
                className="form-input w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-leaf-400/30 focus:border-leaf-400/30 transition-all text-base" 
                placeholder="RFI konusunu kısaca özetleyin (örn: Betonarme kolonların boyutları hakkında)"
              />
            </div>

            {/* Description Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white font-semibold text-sm">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-leaf-400/20 to-ocean-400/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ocean-400">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" x2="8" y1="13" y2="13"/>
                    <line x1="16" x2="8" y1="17" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </div>
                Detaylı Açıklama
              </label>
              <textarea 
                name="description" 
                className="form-input w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-ocean-400/30 focus:border-ocean-400/30 transition-all min-h-[140px] resize-y text-base" 
                placeholder="Detaylı açıklama, sorular ve beklenen bilgiler... 

Örnek:
- Hangi tip beton kullanılacak?
- Kolonların kesit boyutları nedir?
- Betonarme donatısı detayları..."
              />
            </div>

            {/* Reference Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white font-semibold text-sm">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-leaf-400/20 to-ocean-400/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-leaf-400">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                </div>
                Proje Referansları
              </label>
              <input 
                type="text" 
                name="reference_text" 
                placeholder="A-101 Paftası, 3. Kat, Çizim No: X-Y-Z, Detay 15..." 
                className="form-input w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-leaf-400/30 focus:border-leaf-400/30 transition-all text-base" 
              />
            </div>

            {/* Grid Fields */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* To Role Field */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-white font-semibold text-sm">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-leaf-400/20 to-ocean-400/20 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ocean-400">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  Adreslenecek Rol
                </label>
                <input 
                  type="text" 
                  name="to_role" 
                  placeholder="mimar, şantiye şefi, müteahhit..." 
                  className="form-input w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-ocean-400/30 focus:border-ocean-400/30 transition-all text-base" 
                />
              </div>

              {/* Due Date Field */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-white font-semibold text-sm">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-leaf-400/20 to-ocean-400/20 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-leaf-400">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                      <line x1="16" x2="16" y1="2" y2="6"/>
                      <line x1="8" x2="8" y1="2" y2="6"/>
                      <line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                  </div>
                  Yanıt Termin Tarihi
                </label>
                <input 
                  type="date" 
                  name="due_date" 
                  className="form-input w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-leaf-400/30 focus:border-leaf-400/30 transition-all text-base" 
                />
              </div>
            </div>

            {/* From Party Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white font-semibold text-sm">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-leaf-400/20 to-ocean-400/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ocean-400">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                Talep Eden Taraf
              </label>
              <input 
                type="text" 
                name="from_party" 
                placeholder="Biz, X Taşeronu, Y Müteahhidi..." 
                className="form-input w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-ocean-400/30 focus:border-ocean-400/30 transition-all text-base" 
                defaultValue="Biz" 
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-8 border-t border-white/10">
              <button 
                type="submit" 
                className="btn-primary text-base font-semibold py-4 px-8 flex items-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                RFI'yi Oluştur
              </button>
              <Link 
                href={`/projects/${id}/rfi`} 
                className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-base px-4 py-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m12 19-7-7 7-7"/>
                  <path d="M19 12H5"/>
                </svg>
                İptal
              </Link>
            </div>
          </form>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Link 
            href={`/projects/${id}/rfi`}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            RFI Listesine Geri Dön
          </Link>
        </div>
      </div>
    </div>
  );
}