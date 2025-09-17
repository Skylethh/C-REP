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
    <div className="space-y-6">
      {/* Back link / Breadcrumb */}
      <div className="max-w-3xl mx-auto">
        <Link href={`/projects/${id}/rfi`} className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          RFI Listesine Dön
        </Link>
      </div>

      {/* Header Section */}
      <section className="max-w-3xl mx-auto">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/80 to-ocean-900/80 border border-white/10 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 backdrop-blur-sm"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-30"></div>

          <div className="relative p-6">
            <div className="relative pl-11">
              <div className="absolute left-0 top-0 p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
              <h1 className="text-2xl font-bold highlight-text mb-1">Yeni RFI</h1>
              <p className="text-white/70">
                Proje ile ilgili bilgi talep formunuzu oluşturun ve ilgili taraflara gönderin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <div className="glass p-6 rounded-xl border border-white/10 max-w-3xl mx-auto">
        <form action={create} className="space-y-6">
          <div className="space-y-2">
            <label className="form-label flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <path d="M14 2v6h6"></path>
                <path d="M16 13H8"></path>
                <path d="M16 17H8"></path>
              </svg>
              Başlık <span className="text-red-400">*</span>
            </label>
            <input type="text" name="title" required className="form-input w-full" placeholder="RFI konusunu kısaca özetleyin" />
          </div>

          <div className="space-y-2">
            <label className="form-label flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <path d="M14 2v6h6"></path>
                <path d="M16 13H8"></path>
                <path d="M16 17H8"></path>
              </svg>
              Açıklama
            </label>
            <textarea 
              name="description" 
              className="form-input min-h-[120px] w-full" 
              placeholder="Detaylı açıklama, sorular ve beklenen bilgiler..."
            />
          </div>

          <div className="space-y-2">
            <label className="form-label flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Proje Referansları
            </label>
            <input 
              type="text" 
              name="reference_text" 
              placeholder="A-101 Paftası, 3. Kat, Çizim No: X-Y-Z..." 
              className="form-input w-full" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="form-label flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Adreslenecek Rol
              </label>
              <input 
                type="text" 
                name="to_role" 
                placeholder="mimar, şantiye şefi, müteahhit..." 
                className="form-input w-full" 
              />
            </div>

            <div className="space-y-2">
              <label className="form-label flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Termin
              </label>
              <input type="date" name="due_date" className="form-input w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="form-label flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Soran Taraf
            </label>
            <input 
              type="text" 
              name="from_party" 
              placeholder="Biz, X Taşeronu, Y Müteahhidi..." 
              className="form-input w-full" 
              defaultValue="Biz" 
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 pt-6 border-t border-white/10">
            <button type="submit" className="btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2 justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
              RFI'yi Kaydet
            </button>
            <Link href={`/projects/${id}/rfi`} className="px-6 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors text-center">
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
