import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminInventoryClient } from "@/components/AdminInventoryClient";

export default async function AdminInventoryPage() {
  await requireAdmin();

  // Fetch all stock items
  const stock = await prisma.vehicleStock.findMany({
    orderBy: { receivedDate: "desc" },
    include: {
      branch: true,
      saleReport: true
    }
  });

  // Fetch all exchange stock items
  const exchangeStock = await prisma.exchangeVehicle.findMany({
    orderBy: { receivedDate: "desc" },
    include: {
      branch: true,
      saleReport: true
    }
  });

  // Fetch branches for selection filtering and transfers
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" }
  });

  // Format into safe serializable objects for the client component
  const formattedStock = stock.map((s) => ({
    id: s.id,
    chassisNumber: s.chassisNumber,
    engineNumber: s.engineNumber,
    modelName: s.modelName,
    modelVariant: s.modelVariant,
    color: s.color,
    status: s.status,
    receivedDate: s.receivedDate.toISOString().slice(0, 10),
    branchId: s.branchId,
    branchName: s.branch.name,
    saleReportId: s.saleReportId,
    soldTo: s.saleReport ? s.saleReport.customerName : null,
  }));

  const formattedExchangeStock = exchangeStock.map((s) => ({
    id: s.id,
    modelName: s.modelName,
    yearModel: s.yearModel,
    valuation: s.valuation,
    status: s.status,
    receivedDate: s.receivedDate.toISOString().slice(0, 10),
    branchId: s.branchId,
    branchName: s.branch.name,
    saleReportId: s.saleReportId,
    tradedInFrom: s.saleReport.customerName,
  }));

  const formattedBranches = branches.map((b) => ({
    id: b.id,
    name: b.name
  }));

  return (
    <AdminInventoryClient
      initialStock={formattedStock}
      initialExchangeStock={formattedExchangeStock}
      branches={formattedBranches}
    />
  );
}
