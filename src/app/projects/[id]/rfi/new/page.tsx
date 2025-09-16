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
  if (!title) redirect((`/projects/${id}/rfi/new?error=missing_title` as unknown) as Route);
    const { error } = await supabase.from('rfi').insert({ project_id: id, title, description, created_by: user!.id });
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
        <button type="submit" className="btn-primary">Kaydet</button>
      </form>
    </div>
  );
}
