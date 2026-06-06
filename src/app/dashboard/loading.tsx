export default function DashboardLoading() {
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
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-slate-200" />
        </div>

        {/* Stat cards skeleton */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-6 w-20 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>

        {/* Form / submitted section skeleton */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="mb-1.5 h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent submissions skeleton */}
        <div className="mt-10">
          <div className="mb-4 h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-50 px-4 py-3">
              <div className="flex gap-8">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-4 w-16 animate-pulse rounded bg-slate-200"
                  />
                ))}
              </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-8 border-t border-slate-100 px-4 py-3"
              >
                {Array.from({ length: 5 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-4 w-16 animate-pulse rounded bg-slate-200"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
