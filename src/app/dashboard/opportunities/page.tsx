import Link from 'next/link';
import { createClient } from '@/lib/server';
import { analyzeProjectForOpportunities } from '@/lib/opportunitiesEngine';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import ProjectSelector from '@/components/opportunities/ProjectSelector';
import { ProjectSummaryDialog } from '@/components/opportunities/ProjectSummaryDialog';
import { Folder, Plus, Activity } from 'lucide-react';

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
  const aiEnabled = (process.env.OPPORTUNITIES_AI_ENABLED ?? "true") !== "false"
    && (process.env.NEXT_PUBLIC_OPPORTUNITIES_AI_ENABLED ?? "true") !== "false";

  if (!user) {
    return (
      <div className="glass-card text-center py-12 max-w-md mx-auto">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold text-white">Giriş Gerekli</h1>
          <p className="text-white/70">Fırsatları görüntülemek için lütfen giriş yapın.</p>
          <Link href="/login" className="btn-primary inline-flex items-center gap-2">
            Giriş Yap
          </Link>
        </div>
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
      <div className="glass-card text-center py-12 max-w-2xl mx-auto">
        <div className="space-y-6">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10 shadow-inner">
            <Folder className="h-8 w-8 text-leaf-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-white">Henüz Proje Bulunmuyor</h1>
            <p className="text-white/70 leading-relaxed">
              Fırsat motorunu kullanabilmek için önce bir proje oluşturmanız gerekmektedir.
            </p>
          </div>
          <Link href="/projects" className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            İlk Projeyi Oluştur
          </Link>
        </div>
      </div>
    );
  }

  const activeProject = projects.find((p) => p.id === requestedProjectId) ?? projects[0];
  const opportunities = await analyzeProjectForOpportunities(activeProject.id);

  return (
    <div className="space-y-6">
      <header className="glass-card px-5 py-4 relative z-[90] overflow-visible">
        <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 px-2.5 py-0.5 border border-violet-400/30">
                <div className="h-1 w-1 rounded-full bg-violet-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-100">Fırsatlar</span>
              </div>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">İyileştirme Fırsatları</h1>
            <p className="mt-1.5 text-sm text-white/60 max-w-2xl">
              Tespit edilen fırsatları inceleyin, AI ile detaylı analizler alın.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-white/50 mb-1">Aktif Proje</span>
              <ProjectSelector
                projects={projects}
                activeProjectId={activeProject.id}
                className="w-full sm:w-[220px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <ProjectSummaryDialog
                projectId={activeProject.id}
                projectName={activeProject.name ?? 'Proje'}
                aiEnabled={aiEnabled}
              />
              <Link
                href={`/projects/${activeProject.id}`}
                className="btn-secondary px-3 py-2 text-sm font-medium inline-flex items-center gap-2"
              >
                Projeye Git
              </Link>
            </div>
          </div>
        </div>
      </header>

      {opportunities.length === 0 ? (
        <div className="glass-card text-center py-16">
          <div className="max-w-lg mx-auto space-y-5">
            <div className="relative inline-flex p-5 rounded-2xl bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10 shadow-inner">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-leaf-400/10 to-ocean-400/10 animate-pulse" />
              <Activity className="relative h-10 w-10 text-leaf-300" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Henüz Fırsat Tespit Edilmedi</h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-md mx-auto">
                Projenize emisyon verisi eklediğinizde, sistem otomatik olarak iyileştirme fırsatlarını analiz edecektir.
              </p>
            </div>
            <div className="pt-3">
              <Link
                href={`/projects/${activeProject.id}/entries/new`}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                İlk Kaydı Ekle
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="glass-card px-5 py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
                  <div className="h-2 w-2 rounded-full bg-leaf-400 shadow-glow-sm" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-white/50">Tespit Edilen</p>
                  <p className="text-lg font-semibold text-white">{opportunities.length} Fırsat</p>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10 hidden sm:block" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/60 leading-relaxed">
                  AI ile zenginleştirerek her fırsat için detaylı öneri ve eylem adımları alabilirsiniz
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                projectId={activeProject.id}
                aiEnabled={aiEnabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
