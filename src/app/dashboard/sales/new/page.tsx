import { Navbar } from "@/components/Navbar";
import { SaleReportForm } from "@/components/SaleReportForm";
import { requireBranchManager } from "@/lib/auth";

export default async function NewSalePage() {
  const session = await requireBranchManager();

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar user={session} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">New Sale Report</h1>
          <p className="mt-2 text-slate-500">
            Record a vehicle sale for {session.branchName} branch.
          </p>
        </div>
        <SaleReportForm />
      </main>
    </div>
  );
}
