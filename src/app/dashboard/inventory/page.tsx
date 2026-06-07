import { requireBranchManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ManagerInventoryClient } from "@/components/ManagerInventoryClient";

export default async function ManagerInventoryPage() {
  const session = await requireBranchManager();

  // Fetch available stock for this branch, oldest first (FIFO to push aging stock)
  const stock = await prisma.vehicleStock.findMany({
    where: {
      branchId: session.branchId!,
      status: "AVAILABLE",
    },
    orderBy: { receivedDate: "asc" },
  });

  const formattedStock = stock.map((s) => ({
    id: s.id,
    chassisNumber: s.chassisNumber,
    engineNumber: s.engineNumber,
    modelName: s.modelName,
    modelVariant: s.modelVariant,
    color: s.color,
    receivedDate: s.receivedDate.toISOString().slice(0, 10),
  }));

  return (
    <ManagerInventoryClient initialStock={formattedStock} user={session} />
  );
}
