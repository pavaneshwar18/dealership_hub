export default function AdminLoading() {
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
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-200" />
        </div>

        {/* Stat cards skeleton */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-6 w-16 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>

        {/* Branch cards skeleton */}
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j}>
                    <div className="h-3 w-12 animate-pulse rounded bg-slate-100" />
                    <div className="mt-1 h-4 w-10 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
