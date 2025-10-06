import OpportunitySkeleton from '@/components/opportunities/OpportunitySkeleton';

const skeletons = Array.from({ length: 6 });

export default function ProjectOpportunitiesLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/40 to-ocean-900/40 border border-white/10 shadow-lg p-6">
        <div className="h-5 w-32 rounded-md bg-white/10 mb-3" />
        <div className="h-7 w-48 rounded-md bg-white/10" />
        <div className="h-4 w-64 rounded-md bg-white/10 mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {skeletons.map((_, idx) => (
          <OpportunitySkeleton key={idx} />
        ))}
      </div>
    </div>
  );
}
