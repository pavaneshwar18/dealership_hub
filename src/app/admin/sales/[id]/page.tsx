import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { formatModelDisplay } from "@/lib/models";

type AdminSaleDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminSaleDetailPage({ params }: AdminSaleDetailPageProps) {
  const session = await requireAdmin();
  const { id } = await params;

  const sale = await prisma.saleReport.findUnique({
    where: { id },
    include: { branch: true, submittedBy: true },
  });

  if (!sale) {
    notFound();
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
          <Link
            href="/admin/sales"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to all sales
          </Link>
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
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Amount</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatINR(sale.totalAmount)}</p>
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
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Financer</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{sale.financer}</p>
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
