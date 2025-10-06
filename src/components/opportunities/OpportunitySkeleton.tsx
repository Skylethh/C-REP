export function OpportunitySkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg animate-pulse flex flex-col overflow-hidden">
      <div className="flex items-start gap-4 p-5 border-b border-white/10">
        <div className="h-10 w-10 rounded-lg border border-white/15 bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded-full bg-white/10" />
          <div className="h-5 w-3/4 rounded-full bg-white/10" />
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="h-4 w-full rounded-md bg-white/10" />
        <div className="h-4 w-5/6 rounded-md bg-white/10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <div className="h-3 w-20 rounded-md bg-white/10" />
              <div className="h-4 w-24 rounded-md bg-white/15" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 pb-5 mt-auto flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:w-auto w-full">
          <div className="h-10 w-full sm:w-32 rounded-lg bg-white/10" />
          <div className="h-10 w-full sm:w-32 rounded-lg bg-white/10" />
        </div>
        <div className="h-10 w-full sm:w-28 rounded-lg bg-white/10 sm:ml-auto" />
      </div>
    </div>
  );
}

export default OpportunitySkeleton;
