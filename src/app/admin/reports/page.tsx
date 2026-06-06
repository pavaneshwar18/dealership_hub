import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";

export default async function AdminReportsPage() {
  const session = await requireAdmin();

  const reports = await prisma.dailyReport.findMany({
    orderBy: [{ date: "desc" }, { branch: { name: "asc" } }],
    include: { branch: true, submittedBy: true },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar user={session} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">All reports</h1>
          <p className="mt-2 text-slate-500">Latest daily submissions from all five branches</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Manager</th>
                <th className="px-4 py-3 font-medium">Sold</th>
                <th className="px-4 py-3 font-medium">Sales</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No reports yet. Branch managers can start submitting from their dashboard.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{formatDate(report.date)}</td>
                    <td className="px-4 py-3">{report.branch.name}</td>
                    <td className="px-4 py-3">{report.submittedBy.name}</td>
                    <td className="px-4 py-3">{report.vehiclesSold}</td>
                    <td className="px-4 py-3">{formatINR(report.salesValue)}</td>
                    <td className="px-4 py-3">{formatINR(report.serviceRevenue)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          report.status === "REVIEWED"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {report.status === "REVIEWED" ? "Reviewed" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/reports/${report.id}`} className="font-medium text-blue-700 hover:underline">
                        Review
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
