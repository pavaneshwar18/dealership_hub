import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminFinancialsClient } from "@/components/AdminFinancialsClient";

export default async function AdminFinancialsPage() {
  await requireAdmin();

  // Fetch branches for selection filtering
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
  });

  // Fetch active staff for salary logging dropdown
  const staff = await prisma.staff.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const formattedStaff = staff.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
  }));

  return <AdminFinancialsClient branches={branches} staff={formattedStaff} />;
}
