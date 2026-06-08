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

  // Fetch available exchange stock for this branch, oldest first (FIFO to push aging stock)
  const exchangeStock = await prisma.exchangeVehicle.findMany({
    where: {
      branchId: session.branchId!,
      status: "AVAILABLE",
    },
    orderBy: { receivedDate: "asc" },
    include: {
      saleReport: true,
    },
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

  const formattedExchangeStock = exchangeStock.map((s) => ({
    id: s.id,
    modelName: s.modelName,
    yearModel: s.yearModel,
    valuation: s.valuation,
    status: s.status,
    receivedDate: s.receivedDate.toISOString().slice(0, 10),
    saleReportId: s.saleReportId,
    tradedInFrom: s.saleReport ? s.saleReport.customerName : "Unknown",
  }));

  return (
    <ManagerInventoryClient
      initialStock={formattedStock}
      initialExchangeStock={formattedExchangeStock}
      user={session}
    />
  );
}
