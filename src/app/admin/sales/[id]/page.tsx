import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { formatModelDisplay } from "@/lib/models";
import { SaleReportForm } from "@/components/SaleReportForm";
import { AdminSaleDeleteButton } from "@/components/AdminSaleDeleteButton";

type AdminSaleDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function AdminSaleDetailPage({
  params,
  searchParams,
}: AdminSaleDetailPageProps) {
  const session = await requireAdmin();
  const { id } = await params;
  const { edit } = await searchParams;

  const sale = await prisma.saleReport.findUnique({
    where: { id },
    include: { branch: true, submittedBy: true, vehicleStock: true },
  });

  if (!sale) {
    notFound();
  }

  const isEditing = edit === "1";

  if (isEditing) {
    return (
      <div className="mb-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Edit Sale Report</h1>
            <p className="mt-2 text-slate-500">Update this sale record as Admin.</p>
          </div>
          <Link
            href={`/admin/sales/${sale.id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
        <SaleReportForm
          reportId={sale.id}
          branchId={sale.branchId}
          redirectUrl={`/admin/sales/${sale.id}`}
          initialValues={{
            customerName: sale.customerName,
            customerFatherName: sale.customerFatherName,
            customerAddress: sale.customerAddress,
            modelName: sale.modelName,
            modelVariant: sale.modelVariant,
            totalAmount: sale.totalAmount,
            downPayment: sale.downPayment,
            financeAmount: sale.financeAmount,
            financer: sale.financer,
            aadhaarImagePath: sale.aadhaarImagePath,
            createdAt: sale.createdAt,
            paymentType: sale.paymentType,
            paymentMode: sale.paymentMode,
            cashAmount: sale.cashAmount,
            bankAmount: sale.bankAmount,
            vehicleStockId: sale.vehicleStock?.id || "",
            vehicleStock: sale.vehicleStock ? {
              id: sale.vehicleStock.id,
              chassisNumber: sale.vehicleStock.chassisNumber,
              engineNumber: sale.vehicleStock.engineNumber,
              modelName: sale.vehicleStock.modelName,
              modelVariant: sale.vehicleStock.modelVariant,
            } : undefined,
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sale Report</h1>
          <p className="mt-2 text-slate-500">
            {sale.branch.name} · {formatDate(sale.createdAt)} · by {sale.submittedBy.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/sales/${sale.id}?edit=1`}
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Edit
          </Link>
          <AdminSaleDeleteButton saleId={sale.id} />
          <Link
            href="/admin/sales"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to all sales
          </Link>
        </div>
      </div>

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
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Price</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatINR(sale.totalAmount)}</p>
          </div>
          {sale.vehicleStock && (
            <>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Chassis Number</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 font-mono">{sale.vehicleStock.chassisNumber}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Engine Number</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 font-mono">{sale.vehicleStock.engineNumber}</p>
              </div>
            </>
          )}
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
    </>
  );
}
