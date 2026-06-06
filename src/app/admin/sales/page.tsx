import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { formatModelDisplay } from "@/lib/models";

export default async function AdminSalesPage() {
  const session = await requireAdmin();

  const sales = await prisma.saleReport.findMany({
    orderBy: { createdAt: "desc" },
    include: { branch: true, submittedBy: true },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar user={session} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">All Sale Reports</h1>
          <p className="mt-2 text-slate-500">Vehicle sales from all branches</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Finance</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No sale reports yet.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{formatDate(sale.createdAt)}</td>
                    <td className="px-4 py-3">{sale.branch.name}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{sale.customerName}</td>
                    <td className="px-4 py-3">
                      {formatModelDisplay(sale.modelName, sale.modelVariant)}
                    </td>
                    <td className="px-4 py-3">{formatINR(sale.totalAmount)}</td>
                    <td className="px-4 py-3">{formatINR(sale.financeAmount)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/sales/${sale.id}`}
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
