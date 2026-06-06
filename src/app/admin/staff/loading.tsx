export default function StaffLoading() {
  return (
    <>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200 shrink-0" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-50 px-5 py-4">
          <div className="flex justify-between">
            <div className="flex gap-12 flex-1">
              {["w-24", "w-32", "w-24", "w-16"].map((w, i) => (
                <div key={i} className={`h-4 ${w} animate-pulse rounded bg-slate-200`} />
              ))}
            </div>
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex justify-between border-t border-slate-100 px-5 py-5">
            <div className="flex gap-12 flex-1">
              {["w-24", "w-32", "w-24", "w-16"].map((w, j) => (
                <div key={j} className={`h-4 ${w} animate-pulse rounded bg-slate-100`} />
              ))}
            </div>
            <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </>
  );
}
