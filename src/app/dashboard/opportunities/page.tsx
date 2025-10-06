import Link from 'next/link';
import { createClient } from '@/lib/server';
import { analyzeProjectForOpportunities } from '@/lib/opportunitiesEngine';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import ProjectSelector from '@/components/opportunities/ProjectSelector';
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
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/40 via-ocean-900/30 to-transparent border border-white/10 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-leaf-500/5 to-ocean-500/5" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="section-title mb-2">Fırsatlar</h1>
              <p className="text-white/70 text-base max-w-2xl">
                Projeniz için tespit edilen kural tabanlı fırsatları keşfedin. AI ile zenginleştirerek daha detaylı öneriler alabilirsiniz.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
              <ProjectSelector projects={projects} activeProjectId={activeProject.id} className="w-full sm:w-[260px]" />
              <Link
                href={`/projects/${activeProject.id}`}
                className="btn-secondary px-4 py-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-2"
              >
                Projeye Git
              </Link>
            </div>
          </div>
        </div>
      </header>

      {opportunities.length === 0 ? (
        <div className="glass-card text-center py-12">
          <div className="max-w-md mx-auto space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10 shadow-inner">
              <Activity className="h-8 w-8 text-leaf-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Henüz Fırsat Bulunmuyor</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Projenize emisyon verisi ekledikçe sistem otomatik olarak iyileştirme fırsatlarını tespit edecektir.
            </p>
            <div className="pt-2">
              <Link
                href={`/projects/${activeProject.id}/entries/new`}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Yeni Kayıt Ekle
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-xl p-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-leaf-400 shadow-glow-sm" />
              <span className="text-white/70">Toplam</span>
              <span className="font-semibold text-white">{opportunities.length} Fırsat</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-xs">AI ile zenginleştirerek detaylı öneriler alabilirsiniz</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                projectId={activeProject.id}
                aiEnabled={aiEnabled}
                detailsHref={`/projects/${activeProject.id}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
