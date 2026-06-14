import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBranchManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { formatModelDisplay } from "@/lib/models";

type SaleDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const session = await requireBranchManager();
  const { id } = await params;

  const sale = await prisma.saleReport.findUnique({
    where: { id },
    include: { salesExecutive: true },
  });
  if (!sale || sale.branchId !== session.branchId) {
    notFound();
  }

  return (
    <div className="w-full">
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Sale Report</h1>
            <p className="mt-2 text-slate-500">Recorded on {formatDate(sale.createdAt)}</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/sales"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </Link>
          </div>
        </div>

        {sale.status === "PENDING" && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              Pending Approval
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              This sale report is currently awaiting Admin approval. It is locked and has not been finalized.
            </p>
          </div>
        )}

        {sale.status === "REJECTED" && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-rose-900 flex items-center gap-2">
              Sale Rejected by Admin
            </h2>
            <p className="mt-1 text-sm text-rose-800">
              This sale report was rejected by the admin. The associated vehicle is now available for other sales.
            </p>
            {sale.adminComment && (
              <div className="mt-3 rounded-xl bg-rose-100/50 p-3 text-rose-955 text-sm">
                <strong className="font-semibold">Reason for Rejection:</strong> {sale.adminComment}
              </div>
            )}
          </div>
        )}

        {/* Customer Info */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Customer Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer Name</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{sale.customerName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Father&apos;s Name</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{sale.customerFatherName}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</p>
              <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{sale.customerAddress}</p>
            </div>
          </div>
        </section>

        {/* Vehicle & Finance */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Vehicle &amp; Financial Details</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Model</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatModelDisplay(sale.modelName, sale.modelVariant)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Amount</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatINR(sale.totalAmount)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sales Executive</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {sale.salesExecutive?.name || "—"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Approval Status</p>
              <p className="mt-1.5">
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                    sale.status === "APPROVED"
                      ? "bg-green-50 text-green-700 border border-green-100"
                      : sale.status === "PENDING"
                      ? "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                      : "bg-rose-50 text-rose-700 border border-rose-100"
                  }`}
                >
                  {sale.status === "APPROVED" ? "Approved" : sale.status === "PENDING" ? "Pending Approval" : "Rejected"}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Down Payment</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatINR(sale.downPayment)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Finance Amount</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatINR(sale.financeAmount)}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment Type</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{sale.paymentType === "Self" ? "Self (Full Payment)" : "Finance"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment Mode</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {sale.paymentMode === "Both"
                  ? `Both (Cash: ${formatINR(sale.cashAmount)} + Bank: ${formatINR(sale.bankAmount)})`
                  : sale.paymentMode}
              </p>
            </div>
            {sale.paymentType === "Finance" && (
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Financer</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{sale.financer}</p>
              </div>
            )}
          </div>
        </section>

        {/* Aadhaar Card */}
        {sale.aadhaarImagePath && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Aadhaar Card</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/uploads/${sale.aadhaarImagePath}`}
              alt="Customer Aadhaar card"
              className="max-h-80 rounded-xl border border-slate-200 object-contain shadow-sm"
            />
          </section>
        )}
      </main>
    </div>
  );
}
