import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { requireBranchManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";

export default async function HistoryPage() {
  const session = await requireBranchManager();

  const reports = await prisma.dailyReport.findMany({
    where: { branchId: session.branchId! },
    orderBy: { date: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar user={session} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Report history</h1>
            <p className="mt-2 text-slate-500">{session.branchName} branch submissions</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to today
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Sold</th>
                <th className="px-4 py-3 font-medium">Sales</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Cash</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{formatDate(report.date)}</td>
                  <td className="px-4 py-3">{report.vehiclesSold}</td>
                  <td className="px-4 py-3">{formatINR(report.salesValue)}</td>
                  <td className="px-4 py-3">{formatINR(report.serviceRevenue)}</td>
                  <td className="px-4 py-3">{formatINR(report.cashCollected)}</td>
                  <td className="px-4 py-3">{report.status}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/edit/${report.id}`} className="font-medium text-blue-700 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
