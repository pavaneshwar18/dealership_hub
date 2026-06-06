import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { ReportForm } from "@/components/ReportForm";
import { StatCard } from "@/components/StatCard";
import { requireBranchManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatINR, todayIST } from "@/lib/format";

type DashboardPageProps = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requireBranchManager();
  const params = await searchParams;
  const today = todayIST();

  const todayReport = await prisma.dailyReport.findUnique({
    where: {
      branchId_date: {
        branchId: session.branchId!,
        date: today,
      },
    },
    include: { stockEntries: true },
  });

  const recentReports = await prisma.dailyReport.findMany({
    where: { branchId: session.branchId! },
    orderBy: { date: "desc" },
    take: 7,
  });

  const dateInput = today.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar user={session} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {params.saved ? (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Daily report saved successfully.
          </div>
        ) : null}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{session.branchName} Branch</h1>
          <p className="mt-2 text-slate-500">
            Submit today&apos;s Bajaj 3-wheeler numbers for {formatDate(today)}.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Today's status"
            value={todayReport ? "Submitted" : "Pending"}
            hint={todayReport ? "Ready for admin review" : "Not submitted yet"}
            accent={todayReport ? "green" : "amber"}
          />
          <StatCard
            label="Vehicles sold today"
            value={todayReport?.vehiclesSold ?? 0}
            hint="Units"
          />
          <StatCard
            label="Sales value today"
            value={formatINR(todayReport?.salesValue ?? 0)}
          />
        </div>

        {todayReport ? (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Today&apos;s report submitted</h2>
                <p className="text-sm text-slate-500">
                  You can update it until admin marks it reviewed.
                </p>
              </div>
              <Link
                href={`/dashboard/edit/${todayReport.id}`}
                className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Edit today&apos;s report
              </Link>
            </div>
          </section>
        ) : (
          <ReportForm initialDate={dateInput} />
        )}

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent submissions</h2>
            <Link href="/dashboard/history" className="text-sm font-medium text-blue-700 hover:underline">
              View all
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
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No reports submitted yet.
                    </td>
                  </tr>
                ) : (
                  recentReports.map((report) => (
                    <tr key={report.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{formatDate(report.date)}</td>
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
                          {report.status === "REVIEWED" ? "Reviewed" : "Submitted"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
