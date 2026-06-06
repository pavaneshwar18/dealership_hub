export default function AttendanceLoading() {
  return (
    <>
      <div className="mb-8">
        <div className="h-8 w-60 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-96 animate-pulse rounded bg-slate-200" />
      </div>

      {/* Tabs loader */}
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <div className="h-10 w-32 animate-pulse rounded-t-lg bg-slate-200" />
        <div className="h-10 w-44 animate-pulse rounded-t-lg bg-slate-100" />
      </div>

      {/* Filters Loader */}
      <div className="mb-6 h-16 w-full animate-pulse rounded-2xl bg-white border border-slate-200" />

      {/* Table Loader */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-50 px-5 py-4">
          <div className="flex justify-between">
            <div className="flex gap-12 flex-1">
              {["w-24", "w-32", "w-24", "w-16"].map((w, i) => (
                <div key={i} className={`h-4 ${w} animate-pulse rounded bg-slate-200`} />
              ))}
            </div>
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex justify-between border-t border-slate-100 px-5 py-5">
            <div className="flex gap-12 flex-1">
              {["w-24", "w-32", "w-24", "w-16"].map((w, j) => (
                <div key={j} className={`h-4 ${w} animate-pulse rounded bg-slate-100`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
