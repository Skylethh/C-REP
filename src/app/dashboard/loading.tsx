export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="h-7 w-40 bg-white/10 rounded animate-pulse" />
        <div className="h-10 w-36 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-white/10 p-4 bg-white/5 space-y-3 animate-pulse">
            <div className="h-5 w-48 bg-white/10 rounded" />
            <div className="h-4 w-64 bg-white/10 rounded" />
            <div className="h-4 w-40 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}


