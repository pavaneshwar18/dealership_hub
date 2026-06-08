import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminCashSheetsClient } from "@/components/AdminCashSheetsClient";

export default async function AdminCashSheetsPage() {
  await requireAdmin();

  // Fetch branches for selection filtering
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
  });

  return <AdminCashSheetsClient branches={branches} />;
}
