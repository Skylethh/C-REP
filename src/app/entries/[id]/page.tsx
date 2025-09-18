import Link from 'next/link';
import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { formatCo2eTons } from '@/lib/units';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { updateEntryNotesAction, deleteEntryAction } from '../actions';
import { EvidenceUploader } from '@/components/EvidenceUploader';
import { deleteEvidence } from '@/app/projects/[id]/evidence/server';

export default async function EntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect((`/login?next=${encodeURIComponent(`/entries/${id}`)}` as unknown) as Route);

  const [{ data: entry, error }, { data: evidence }] = await Promise.all([
    supabase
      .from('entries')
      .select('id, project_id, date, type, category, activity_id, amount, unit, notes, co2e_value, co2e_unit, projects(name), activities(name, key)')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('evidence_files')
      .select('id, file_path, mime, size, created_at, entry_id')
      .eq('entry_id', id)
      .order('created_at', { ascending: false })
  ]);

  if (error) return <div>Kayıt yüklenemedi: {String(error.message || error)}</div>;
  if (!entry) return <div>Kayıt bulunamadı.</div>;

  const co2e = Number(entry.co2e_value ?? 0);
  const co2eFmt = Number.isFinite(co2e) && co2e > 0 ? formatCo2eTons(co2e, 3) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={("/entries" as any)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white transition-colors"
            aria-label="Geri"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Geri</span>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold leading-none">Aktivite Detayı</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <form action={deleteEntryAction}>
            <input type="hidden" name="entryId" value={entry.id} />
            <input type="hidden" name="redirectTo" value={((`/projects/${entry.project_id}#entries` as unknown) as string)} />
            <ConfirmSubmitButton
              className="px-3 py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors"
              message="Bu aktiviteyi silmek istediğinize emin misiniz?"
            >
              Sil
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Proje">
                {entry.project_id ? (
                  <Link className="text-leaf-400 hover:underline" href={`/projects/${entry.project_id}`}>{(entry as any).projects?.name || entry.project_id}</Link>
                ) : '—'}
              </InfoRow>
              <InfoRow label="Tarih">{new Date(entry.date as any).toLocaleDateString()}</InfoRow>
              <InfoRow label="Aktivite">{(entry as any).activities?.name || entry.category || '—'}</InfoRow>
              <InfoRow label="Tür">{entry.type}</InfoRow>
              <InfoRow label="Miktar">{entry.amount} {entry.unit}</InfoRow>
              <InfoRow label="CO₂e">{co2eFmt ? `${co2eFmt.value} ${co2eFmt.unit}` : '-'}</InfoRow>
            </div>
            <div className="mt-4">
              <form id="notes-form" action={updateEntryNotesAction} className="flex items-center gap-2">
                <input type="hidden" name="entryId" value={entry.id} />
                <input
                  name="notes"
                  defaultValue={(entry as any).notes || ''}
                  placeholder="Notlar"
                  className="form-input py-2 px-3 flex-1"
                />
              </form>
            </div>
          </div>

          <div id="evidence" className="rounded-lg border border-white/10 bg-white/5 p-4 scroll-mt-24">
            <div className="text-sm font-medium mb-3 text-white/80">Kanıtlar</div>
            <EvidenceUploader projectId={entry.project_id} entryId={entry.id} onUploaded={undefined} />
            <div className="mt-4 divide-y divide-white/10">
              {(evidence || []).length === 0 ? (
                <div className="text-sm text-white/60">Henüz kanıt eklenmemiş.</div>
              ) : (
                (evidence || []).map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <div className="text-white/80 text-sm truncate">{f.file_path}</div>
                      <div className="text-xs text-white/60">{f.mime || 'dosya'} · {(f.size ? (f.size/1024).toFixed(1) : '0')} KB · {new Date(f.created_at as any).toLocaleString()}</div>
                    </div>
                    <form action={deleteEvidence.bind(null, entry.project_id)}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="file_path" value={f.file_path} />
                      <ConfirmSubmitButton
                        className="px-3 py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors"
                        message="Bu kanıtı silmek istediğinize emin misiniz?"
                      >
                        Sil
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 bg-gradient-to-t from-ocean-950/80 to-transparent backdrop-blur supports-[backdrop-filter]:backdrop-blur flex justify-end pt-4 mt-6 border-t border-white/10">
        <button
          form="notes-form"
          type="submit"
          name="redirectTo"
          value={`/projects/${entry.project_id}#entries`}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-leaf-600 to-ocean-600 hover:from-leaf-500 hover:to-ocean-500 text-white shadow-md hover:shadow-lg transition-all border border-white/10"
        >
          Kaydet ve Çık
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-sm text-white/90">{children}</div>
    </div>
  );
}
