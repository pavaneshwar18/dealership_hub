import { Navbar } from "@/components/Navbar";
import { SaleReportForm } from "@/components/SaleReportForm";
import { requireBranchManager } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function NewSalePage() {
  const session = await requireBranchManager();

  // Fetch active staff members for this branch to assign as Sales Executive
  const staff = await prisma.staff.findMany({
    where: {
      branchId: session.branchId!,
      active: true,
    },
    orderBy: { name: "asc" },
  });

  const formattedStaff = staff.map((s) => ({
    id: s.id,
    name: s.name,
  }));

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
        <SaleReportForm branchId={session.branchId!} staff={formattedStaff} />
      </main>
    </div>
  );
}
