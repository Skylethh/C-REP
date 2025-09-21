import { createClient } from '@/lib/server';
import { analyzeProjectForOpportunities } from '@/lib/opportunities';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import ResetDismissButton from '@/components/opportunities/ResetDismissButton';
import DismissButton from '@/components/opportunities/DismissButton';
import { Lightbulb, TrendingUp, Hammer } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProjectOpportunitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Yetkisiz</div>;

  const [{ data: project }, opps] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', p.id).maybeSingle(),
    analyzeProjectForOpportunities(p.id, { userId: user.id }),
  ]);

  if (!project) return <div>Proje bulunamadı</div>;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/80 to-ocean-900/80 border border-white/10 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 backdrop-blur-sm"></div>
        <div className="relative p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-white/80 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/10 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  <span>Projeye Dön</span>
                </Link>
              </div>
              <h1 className="text-2xl font-bold mb-1 highlight-text">Proje Fırsatları</h1>
              <p className="text-white/70">{project.name} için önerilen iyileştirme alanları</p>
            </div>
            <div className="sm:ml-auto">
              <div className="w-full sm:w-auto">
                <ResetDismissButton projectId={project.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {opps.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-white/70 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <span className="min-w-0">Henüz gösterilecek fırsat bulunamadı. Veri eklendikçe öneriler burada görünecektir.</span>
          <a
            href={`/projects/${project.id}/entries/new`}
            className="bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 px-4 py-3 sm:py-2.5 rounded-lg transition-all duration-200 w-full sm:w-auto text-center"
          >
            Yeni Kayıt Ekle
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {opps.map((o) => {
            const icon = o.ruleId === 'high-concentration' ? <Lightbulb size={16} className="text-leaf-400"/>
              : o.ruleId === 'self-benchmark-trend' ? <TrendingUp size={16} className="text-leaf-400"/>
              : <Hammer size={16} className="text-leaf-400"/>;
            const detailsHref = `/projects/${project.id}`;
            const filteredHref = (() => {
              const cat = o.meta?.category ? `category=${encodeURIComponent(o.meta.category)}` : '';
              const categoryRaw = o.meta?.categoryRaw ? `categoryRaw=${encodeURIComponent(o.meta.categoryRaw)}` : '';
              const activityKey = o.meta?.activityKey ? `activityKey=${encodeURIComponent(o.meta.activityKey)}` : '';
              const period = o.meta?.period ? `start=${encodeURIComponent(o.meta.period.start)}&end=${encodeURIComponent(o.meta.period.end)}` : '';
              const qs = [cat, categoryRaw, activityKey, period].filter(Boolean).join('&');
              return qs ? `/projects/${project.id}?${qs}#entries` : `/projects/${project.id}#entries`;
            })();
            return (
              <OpportunityCard
                key={o.id}
                icon={icon}
                title={o.title}
                finding={o.finding}
                suggestion={o.suggestion}
                impact={o.impact}
                severity={o.severity}
                detailsHref={detailsHref}
                filteredHref={filteredHref}
                filteredLabel={o.ruleId === 'self-benchmark-trend' ? 'Son 30 Gün Filtreli Aç' : 'Detayları Filtreli Aç'}
                rightAction={<DismissButton projectId={project.id} opportunityId={o.id} ruleId={o.ruleId} />}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
