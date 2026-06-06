export default function SalesLoading() {
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Navbar skeleton */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-5 w-36 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="h-8 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-56 animate-pulse rounded bg-slate-200" />
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-50 px-4 py-3">
            <div className="flex gap-6">
              {["w-14", "w-16", "w-24", "w-20", "w-16", "w-16", "w-12"].map(
                (w, i) => (
                  <div
                    key={i}
                    className={`h-4 ${w} animate-pulse rounded bg-slate-200`}
                  />
                )
              )}
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-6 border-t border-slate-100 px-4 py-3"
            >
              {["w-14", "w-16", "w-24", "w-20", "w-16", "w-16", "w-12"].map(
                (w, j) => (
                  <div
                    key={j}
                    className={`h-4 ${w} animate-pulse rounded bg-slate-200`}
                  />
                )
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
