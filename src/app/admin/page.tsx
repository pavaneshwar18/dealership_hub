import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatINR, todayIST } from "@/lib/format";

export default async function AdminPage() {
  const session = await requireAdmin();
  const today = todayIST();

  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: {
      reports: {
        where: { date: today },
        take: 1,
      },
    },
  });

  const todayReports = await prisma.dailyReport.findMany({
    where: { date: today },
    include: { branch: true },
  });

  const totals = todayReports.reduce(
    (acc, report) => {
      acc.vehiclesSold += report.vehiclesSold;
      acc.salesValue += report.salesValue;
      acc.serviceRevenue += report.serviceRevenue;
      acc.cashCollected += report.cashCollected;
      acc.complaints += report.customerComplaints;
      return acc;
    },
    {
      vehiclesSold: 0,
      salesValue: 0,
      serviceRevenue: 0,
      cashCollected: 0,
      complaints: 0,
    },
  );

  const submittedCount = todayReports.length;
  const pendingCount = branches.length - submittedCount;

  return (
    <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin overview</h1>
          <p className="mt-2 text-slate-500">
            All-branch snapshot for {formatDate(today)} · Bajaj 3-wheeler auto
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Reports submitted" value={`${submittedCount}/5`} hint={`${pendingCount} pending`} accent={pendingCount ? "amber" : "green"} />
          <StatCard label="Total vehicles sold" value={totals.vehiclesSold} />
          <StatCard label="Total sales value" value={formatINR(totals.salesValue)} />
          <StatCard label="Total service revenue" value={formatINR(totals.serviceRevenue)} />
          <StatCard label="Cash collected" value={formatINR(totals.cashCollected)} accent="green" />
        </div>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Branch submission status</h2>
            <Link href="/admin/reports" className="text-sm font-medium text-blue-700 hover:underline">
              View all reports
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {branches.map((branch) => {
              const report = branch.reports[0];
              const submitted = Boolean(report);

              return (
                <article
                  key={branch.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{branch.name}</h3>
                      <p className="text-sm text-slate-500">{branch.city}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        submitted
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {submitted ? "Submitted" : "Pending"}
                    </span>
                  </div>

                  {report ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500">Sold</p>
                        <p className="font-semibold text-slate-900">{report.vehiclesSold}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Sales</p>
                        <p className="font-semibold text-slate-900">{formatINR(report.salesValue)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Service</p>
                        <p className="font-semibold text-slate-900">{formatINR(report.serviceRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Complaints</p>
                        <p className="font-semibold text-slate-900">{report.customerComplaints}</p>
                      </div>
                      {report.issues ? (
                        <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                          <p className="text-xs font-semibold uppercase tracking-wide">Issue flagged</p>
                          <p className="mt-1 line-clamp-2">{report.issues}</p>
                        </div>
                      ) : null}
                      <div className="col-span-2">
                        <Link
                          href={`/admin/reports/${report.id}`}
                          className="text-sm font-medium text-blue-700 hover:underline"
                        >
                          Open report
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      Waiting for branch manager to submit today&apos;s report.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {totals.complaints > 0 ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
            <h2 className="font-semibold">Attention needed</h2>
            <p className="mt-1 text-sm">
              {totals.complaints} customer complaint(s) reported across branches today.
            </p>
          </section>
        ) : null}
    </>
  );
}
