import Link from "next/link";
import { requireBranchManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { formatModelDisplay } from "@/lib/models";

type SalesPageProps = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const session = await requireBranchManager();
  const params = await searchParams;

  const sales = await prisma.saleReport.findMany({
    where: { branchId: session.branchId! },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="w-full">
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {params.saved ? (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Sale report saved successfully.
          </div>
        ) : null}

        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Sale Reports</h1>
            <p className="mt-2 text-slate-500">{session.branchName} branch vehicle sales</p>
          </div>
          <Link
            href="/dashboard/sales/new"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            + New Sale
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Finance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No sale reports yet. Click &quot;+ New Sale&quot; to add one.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{formatDate(sale.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{sale.customerName}</div>
                      <div className="text-xs text-slate-500">
                        {sale.paymentType === "Self" ? "Self" : sale.financer || "Finance"} • {sale.paymentMode === "Both" ? `Both (Cash: ${formatINR(sale.cashAmount)} + Bank: ${formatINR(sale.bankAmount)})` : sale.paymentMode || "Cash"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {formatModelDisplay(sale.modelName, sale.modelVariant)}
                    </td>
                    <td className="px-4 py-3">{formatINR(sale.totalAmount)}</td>
                    <td className="px-4 py-3">{formatINR(sale.financeAmount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          sale.status === "APPROVED"
                            ? "bg-green-50 text-green-700"
                            : sale.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 animate-pulse"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {sale.status === "APPROVED"
                          ? "Approved"
                          : sale.status === "PENDING"
                          ? "Pending"
                          : "Rejected"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/sales/${sale.id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
