import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminReviewPanel } from "@/components/AdminReviewPanel";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";

type AdminReportDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminReportDetailPage({ params }: AdminReportDetailPageProps) {
  const session = await requireAdmin();
  const { id } = await params;

  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: { branch: true, submittedBy: true, stockEntries: true },
  });

  if (!report) notFound();

  return (
    <>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{report.branch.name} report</h1>
            <p className="mt-2 text-slate-500">
              {formatDate(report.date)} · Submitted by {report.submittedBy.name}
            </p>
          </div>
          <Link
            href="/admin/reports"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to all reports
          </Link>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Vehicles sold" value={String(report.vehiclesSold)} />
          <Metric label="Sales value" value={formatINR(report.salesValue)} />
          <Metric label="Bookings" value={String(report.bookings)} />
          <Metric label="Pending deliveries" value={String(report.pendingDeliveries)} />
          <Metric label="Test drives" value={String(report.testDrives)} />
          <Metric label="Service jobs" value={String(report.serviceJobs)} />
          <Metric label="Service revenue" value={formatINR(report.serviceRevenue)} />
          <Metric label="Cash collected" value={formatINR(report.cashCollected)} />
          <Metric label="Pending payments" value={formatINR(report.pendingPayments)} />
          <Metric label="Staff present" value={String(report.staffPresent)} />
          <Metric label="Customer complaints" value={String(report.customerComplaints)} />
        </section>

        <AdminReviewPanel
          report={{
            ...report,
            date: report.date.toISOString(),
            stockEntries: report.stockEntries.map((e) => ({
              modelName: e.modelName,
              modelVariant: e.modelVariant,
              stockOnHand: e.stockOnHand,
              newStockReceived: e.newStockReceived,
            })),
          }}
        />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
