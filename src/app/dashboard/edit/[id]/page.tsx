import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ReportForm } from "@/components/ReportForm";
import { requireBranchManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateToISTString } from "@/lib/format";

type EditReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditReportPage({ params }: EditReportPageProps) {
  const session = await requireBranchManager();
  const { id } = await params;

  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: { stockEntries: true },
  });
  if (!report || report.branchId !== session.branchId) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar user={session} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Edit report</h1>
          <p className="mt-2 text-slate-500">Update submitted numbers for your branch.</p>
        </div>
        <ReportForm
          reportId={report.id}
          initialDate={formatDateToISTString(report.date)}
          initialValues={{
            vehiclesSold: report.vehiclesSold,
            salesValue: report.salesValue,
            bookings: report.bookings,
            pendingDeliveries: report.pendingDeliveries,
            testDrives: report.testDrives,
            serviceJobs: report.serviceJobs,
            serviceRevenue: report.serviceRevenue,
            cashCollected: report.cashCollected,
            pendingPayments: report.pendingPayments,
            staffPresent: report.staffPresent,
            customerComplaints: report.customerComplaints,
            highlights: report.highlights ?? "",
            issues: report.issues ?? "",
            notes: report.notes ?? "",
            stockEntries: report.stockEntries.map((e) => ({
              modelName: e.modelName,
              modelVariant: e.modelVariant,
              stockOnHand: e.stockOnHand,
              newStockReceived: e.newStockReceived,
            })),
          }}
        />
      </main>
    </div>
  );
}
