export default function ManagerAttendanceLoading() {
  return (
    <div className="w-full">


      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-200" />
        </div>

        {/* Date Selector Skeleton */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-8 w-44 animate-pulse rounded bg-slate-200" />
        </div>

        {/* List Skeleton */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-5 border-b border-slate-100 last:border-b-0">
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-9 w-44 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
