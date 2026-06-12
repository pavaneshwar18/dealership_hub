import { requireBackOffice } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateToISTString } from "@/lib/format";
import { formatModelDisplay } from "@/lib/models";
import { AdminSalesClient } from "@/components/AdminSalesClient";

export default async function BackOfficeSalesPage() {
  await requireBackOffice();

  // Fetch sales reports with a larger limit for comprehensive overview
  const sales = await prisma.saleReport.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      branch: true,
      submittedBy: true,
    },
    take: 1000,
  });

  // Fetch branches for selection filtering
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
  });

  // Format into safe schemas for the client component
  const formattedSales = sales.map((sale) => ({
    id: sale.id,
    createdAt: formatDateToISTString(sale.createdAt),
    branchId: sale.branchId,
    branchName: sale.branch.name,
    customerName: sale.customerName,
    modelName: sale.modelName,
    modelVariant: sale.modelVariant,
    modelDisplay: formatModelDisplay(sale.modelName, sale.modelVariant),
    totalAmount: sale.totalAmount,
    financeAmount: sale.financeAmount,
    financer: sale.financer,
    paymentType: sale.paymentType,
    paymentMode: sale.paymentMode,
    cashAmount: sale.cashAmount,
    bankAmount: sale.bankAmount,
    status: sale.status,
    adminComment: sale.adminComment,
  }));

  const formattedBranches = branches.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return (
    <AdminSalesClient 
      initialSales={formattedSales} 
      branches={formattedBranches} 
      basePath="/backoffice/sales" 
    />
  );
}
