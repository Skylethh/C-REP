import Link from 'next/link';
import { createClient } from '@/lib/server';
import { analyzeProjectForOpportunities } from '@/lib/opportunities';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import ProjectSelector from '@/components/opportunities/ProjectSelector';
import ResetDismissedButton from '@/components/opportunities/ResetDismissedButton';

export const dynamic = 'force-dynamic';

type Search = Promise<Record<string, string | string[] | undefined>> | undefined;

function resolveParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default async function OpportunitiesDashboardPage({ searchParams }: { searchParams?: Search }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Fırsatlar</h1>
        <p className="text-white/70">Devam etmek için lütfen giriş yapın.</p>
        <Link href="/login" className="underline">Giriş</Link>
      </div>
    );
  }

  const params = (await searchParams) || {};
  const requestedProjectId = resolveParam(params.projectId);

  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, name')
    .order('created_at', { ascending: false });

  const projects = projectsData ?? [];

  if (!projects.length) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold">Fırsatlar</h1>
        <p className="text-white/70">Henüz bir projeniz bulunmuyor. Önce bir proje oluşturarak fırsat motorunu harekete geçirebilirsiniz.</p>
        <Link href="/projects" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/20 transition-all">
          Proje Oluştur
        </Link>
      </div>
    );
  }

  const activeProject = projects.find((p) => p.id === requestedProjectId) ?? projects[0];
  const { opportunities, dismissedCount } = await analyzeProjectForOpportunities(activeProject.id);
  const renderKey = opportunities.length ? opportunities.map((op) => op.opportunityKey).join('|') : 'empty';
  const hiddenLabel = dismissedCount > 0 ? `${dismissedCount} gizli fırsat` : null;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Fırsatlar</h1>
            <p className="text-white/70">Seçili proje için kural tabanlı içgörüler.</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <ProjectSelector projects={projects} activeProjectId={activeProject.id} className="w-full sm:w-[260px]" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:ml-auto w-full sm:w-auto">
              <ResetDismissedButton projectId={activeProject.id} />
              {hiddenLabel && (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                  {hiddenLabel}
                </span>
              )}
              <Link
                href={`/projects/${activeProject.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                Projeye Git
              </Link>
            </div>
          </div>
        </div>
      </header>

      {opportunities.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Şimdilik fırsat bulunmuyor</h2>
          <p className="text-white/70 text-sm">Yeni veriler eklendikçe sistem otomatik olarak fırsatları oluşturacaktır.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.opportunityKey}
              opportunity={opportunity}
              detailsHref={`/projects/${activeProject.id}`}
              entryHref={
                opportunity.type === 'ANOMALY_DETECTED' && opportunity.metadata?.entry_id
                  ? `/projects/${activeProject.id}?entryId=${encodeURIComponent(String(opportunity.metadata.entry_id))}#entries`
                  : undefined
              }
              projectId={activeProject.id}
              renderKey={renderKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}
