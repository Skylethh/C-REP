import Link from 'next/link';
import { createClient } from '@/lib/server';
import { analyzeProjectForOpportunities } from '@/lib/opportunities';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import ResetDismissedButton from '@/components/opportunities/ResetDismissedButton';

export const dynamic = 'force-dynamic';

export default async function ProjectOpportunitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Yetkisiz</div>;

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).maybeSingle();
  if (!project) return <div>Proje bulunamadı</div>;

  const { opportunities, dismissedCount } = await analyzeProjectForOpportunities(id);
  const renderKey = opportunities.length ? opportunities.map((op) => op.opportunityKey).join('|') : 'empty';
  const hiddenLabel = dismissedCount > 0 ? `${dismissedCount} gizli fırsat` : null;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/80 to-ocean-900/80 border border-white/10 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 backdrop-blur-sm" />
        <div className="relative p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-white/80 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/10 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                <span>Projeye Dön</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold highlight-text">Proje Fırsatları</h1>
                <p className="text-white/70">{project.name} için kural tabanlı içgörüler</p>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-2 sm:self-start">
              <ResetDismissedButton projectId={project.id} />
              {hiddenLabel && (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                  {hiddenLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-white/70 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <span className="min-w-0">Henüz gösterilecek fırsat bulunamadı. Veri eklendikçe öneriler burada görünecektir.</span>
          <Link
            href={{ pathname: `/projects/${project.id}/entries/new` }}
            className="bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 px-4 py-3 sm:py-2.5 rounded-lg transition-all duration-200 w-full sm:w-auto text-center"
          >
            Yeni Kayıt Ekle
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.opportunityKey}
              opportunity={opportunity}
              detailsHref={`/projects/${project.id}`}
              entryHref={
                opportunity.type === 'ANOMALY_DETECTED' && opportunity.metadata?.entry_id
                  ? `/projects/${project.id}?entryId=${encodeURIComponent(String(opportunity.metadata.entry_id))}#entries`
                  : undefined
              }
              renderKey={renderKey}
              projectId={project.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
