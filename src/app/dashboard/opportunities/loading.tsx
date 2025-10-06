import OpportunitySkeleton from '@/components/opportunities/OpportunitySkeleton';

const skeletons = Array.from({ length: 6 });

export default function DashboardOpportunitiesLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-3 w-full lg:w-auto">
          <div className="h-9 w-48 rounded-lg bg-white/10" />
          <div className="h-4 w-64 rounded-lg bg-white/10" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <div className="h-10 w-full sm:w-64 rounded-lg bg-white/10" />
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="h-10 w-full sm:w-44 rounded-lg bg-white/10" />
            <div className="h-10 w-full sm:w-40 rounded-lg bg-white/10" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {skeletons.map((_, idx) => (
          <OpportunitySkeleton key={idx} />
        ))}
      </div>
    </div>
  );
}
