import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { formatModelDisplay } from "@/lib/models";
import { SaleReportForm } from "@/components/SaleReportForm";
import { AdminSaleDeleteButton } from "@/components/AdminSaleDeleteButton";
import { AdminSaleApprovalControls } from "@/components/AdminSaleApprovalControls";

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
    include: { branch: true, submittedBy: true, vehicleStock: true, salesExecutive: true },
  });

  if (!sale) {
    notFound();
  }

  // Fetch active staff for this branch (and the currently assigned executive, if any, even if inactive)
  const staff = await prisma.staff.findMany({
    where: {
      branchId: sale.branchId,
      OR: [
        { active: true },
        { id: sale.salesExecutiveId || undefined }
      ]
    },
    orderBy: { name: "asc" },
  });

  const formattedStaff = staff.map((s) => ({
    id: s.id,
    name: s.name,
  }));

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
          staff={formattedStaff}
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
            hasExchange: sale.hasExchange,
            exchangeAmount: sale.exchangeAmount,
            exchangeModel: sale.exchangeModel,
            exchangeYear: sale.exchangeYear,
            hasHandLoan: sale.hasHandLoan,
            handLoanAmount: sale.handLoanAmount,
            salesExecutiveId: sale.salesExecutiveId,
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

      {sale.status === "PENDING" && sale.vehicleStock && (
        <AdminSaleApprovalControls
          saleId={sale.id}
          customerName={sale.customerName}
          totalAmount={sale.totalAmount}
          mrpAmount={sale.vehicleStock.mrpAmount}
        />
      )}

      {sale.status === "REJECTED" && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-rose-900 flex items-center gap-2">
            Sale Rejected by Admin
          </h2>
          <p className="mt-1.5 text-sm text-rose-800">
            This sale was rejected. The linked vehicle stock is now available for other sales.
          </p>
          {sale.adminComment && (
            <div className="mt-3 rounded-xl bg-rose-100/50 p-3 text-rose-950 text-sm">
              <strong className="font-semibold">Rejection Comment:</strong> {sale.adminComment}
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
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Price</p>
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
          {sale.hasExchange && (
            <>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Exchange Model / Year</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{sale.exchangeModel} ({sale.exchangeYear})</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Exchange Value</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatINR(sale.exchangeAmount)}</p>
              </div>
            </>
          )}
          {sale.hasHandLoan && (
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Hand Loan Amount</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatINR(sale.handLoanAmount)}</p>
            </div>
          )}
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
