import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';

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
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-semibold mb-4">Yeni RFI</h1>
      <form action={create} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm mb-1">Başlık</label>
          <input type="text" name="title" required className="form-input" />
        </div>
        <div>
          <label className="block text-sm mb-1">Açıklama</label>
          <textarea name="description" className="form-input min-h-[120px]" />
        </div>
        <div>
          <label className="block text-sm mb-1">Proje Referansları</label>
          <input type="text" name="reference_text" placeholder="A-101 Paftası, 3. Kat" className="form-input" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Adreslenecek Rol (opsiyonel)</label>
            <input type="text" name="to_role" placeholder="mimar, şantiye şefi..." className="form-input" />
          </div>
          <div>
            <label className="block text-sm mb-1">Termin (opsiyonel)</label>
            <input type="date" name="due_date" className="form-input" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Soran Taraf</label>
          <input type="text" name="from_party" placeholder="Biz, X Taşeronu" className="form-input" defaultValue="Biz" />
        </div>
        <button type="submit" className="btn-primary">Kaydet</button>
      </form>
    </div>
  );
}
