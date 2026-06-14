import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateToISTString } from "@/lib/format";
import { AdminAnalyticsClient } from "@/components/AdminAnalyticsClient";

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  // Fetch all sale reports for financial analysis
  const sales = await prisma.saleReport.findMany({
    orderBy: { createdAt: "desc" },
    include: { branch: true },
  });

  const formattedSales = sales.map((s) => ({
    id: s.id,
    createdAt: formatDateToISTString(s.createdAt),
    branchId: s.branchId,
    branchName: s.branch.name,
    customerName: s.customerName,
    totalAmount: s.totalAmount,
    financeAmount: s.financeAmount,
    financer: s.financer,
    paymentType: s.paymentType,
    paymentMode: s.paymentMode,
    modelName: s.modelName,
    modelVariant: s.modelVariant,
  }));

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-2 text-slate-500">
          View deep analytics on branches, models, and auto financing matrices.
        </p>
      </div>

      <AdminAnalyticsClient initialSales={formattedSales} />
    </>
  );
}
