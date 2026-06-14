import { requireBranchManager } from "@/lib/auth";
import { CashSheetClient } from "@/components/CashSheetClient";
import { prisma } from "@/lib/db";

export default async function CashSheetPage() {
  const session = await requireBranchManager();

  // Fetch active staff at this manager's branch for salary dropdown
  const staff = await prisma.staff.findMany({
    where: { branchId: session.branchId as string, active: true },
    orderBy: { name: "asc" },
  });

  const formattedStaff = staff.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
  }));

  return (
    <div className="w-full">
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <CashSheetClient user={session} staff={formattedStaff} />
      </main>
    </div>
  );
}
