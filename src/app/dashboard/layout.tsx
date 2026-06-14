import { Navbar } from "@/components/Navbar";
import { SidebarLink } from "@/components/SidebarLink";
import { requireBranchManager } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireBranchManager();

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Navbar user={session} />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 md:flex-row md:gap-8 sm:px-6">
        {/* Sidebar Navigation Panel */}
        <aside className="w-full shrink-0 md:w-60">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-1.5">
            <p className="px-3.5 mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              Branch Dashboard
            </p>
            

            <SidebarLink href="/dashboard/sales" label="Sales">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </SidebarLink>

            <SidebarLink href="/dashboard/inventory" label="Stock Inventory">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </SidebarLink>

            <SidebarLink href="/dashboard/cashsheet" label="Cash Sheet">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </SidebarLink>


            <SidebarLink href="/dashboard/attendance" label="Attendance">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </SidebarLink>

          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
