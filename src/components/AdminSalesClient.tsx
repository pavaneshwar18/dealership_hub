"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatINR, formatDate } from "@/lib/format";

type SaleItem = {
  id: string;
  createdAt: string; // YYYY-MM-DD
  branchId: string;
  branchName: string;
  customerName: string;
  modelName: string;
  modelVariant: string | null;
  modelDisplay: string;
  totalAmount: number;
  financeAmount: number;
  financer: string;
  paymentType?: string;
  paymentMode?: string;
  cashAmount?: number;
  bankAmount?: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminComment: string | null;
};

type BranchItem = {
  id: string;
  name: string;
};

type AdminSalesClientProps = {
  initialSales: SaleItem[];
  branches: BranchItem[];
};

export function AdminSalesClient({ initialSales, branches }: AdminSalesClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // Get current month in YYYY-MM format in Asia/Kolkata timezone
  const currentMonthStr = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(new Date());
    const month = parts.find((p) => p.type === "month")?.value;
    const year = parts.find((p) => p.type === "year")?.value;
    return `${year}-${month}`;
  }, []);

  const [selectedBranchId, setSelectedBranchId] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedFinancer, setSelectedFinancer] = useState("ALL");
  const [selectedModel, setSelectedModel] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [exportOpen, setExportOpen] = useState(false);

  // Extract unique months dynamically from sales list (YYYY-MM), sorted descending
  // ensuring the current month is always available as an option
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonthStr);
    initialSales.forEach((s) => {
      const month = s.createdAt.slice(0, 7);
      months.add(month);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [initialSales, currentMonthStr]);

  // Extract unique financers dynamically from sales list, sorted alphabetically
  const financerOptions = useMemo(() => {
    const financers = new Set<string>();
    initialSales.forEach((s) => {
      if (s.financer && s.financer.trim()) {
        financers.add(s.financer.trim());
      }
    });
    return Array.from(financers).sort((a, b) => a.localeCompare(b));
  }, [initialSales]);

  // Extract unique model displays dynamically from sales list, sorted alphabetically
  const modelOptions = useMemo(() => {
    const models = new Set<string>();
    initialSales.forEach((s) => {
      if (s.modelDisplay) {
        models.add(s.modelDisplay);
      }
    });
    return Array.from(models).sort((a, b) => a.localeCompare(b));
  }, [initialSales]);

  // Filtered sales matching chosen filter states
  const filteredSales = useMemo(() => {
    return initialSales.filter((sale) => {
      if (selectedBranchId !== "ALL" && sale.branchId !== selectedBranchId) {
        return false;
      }
      if (selectedMonth !== "ALL" && sale.createdAt.slice(0, 7) !== selectedMonth) {
        return false;
      }
      if (selectedFinancer !== "ALL" && sale.financer.trim() !== selectedFinancer) {
        return false;
      }
      if (selectedModel !== "ALL" && sale.modelDisplay !== selectedModel) {
        return false;
      }
      if (selectedStatus !== "ALL" && sale.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [initialSales, selectedBranchId, selectedMonth, selectedFinancer, selectedModel, selectedStatus]);

  const formatPeriodLabel = (p: string): string => {
    if (p === "ALL") return "All Months";
    const [year, month] = p.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Branch",
      "Customer",
      "Model",
      "Total Amount (INR)",
      "Payment Type",
      "Payment Mode",
      "Finance Amount (INR)",
      "Financer"
    ];
    const rows = filteredSales.map((sale) => [
      sale.createdAt,
      `"${sale.branchName.replace(/"/g, '""')}"`,
      `"${sale.customerName.replace(/"/g, '""')}"`,
      `"${sale.modelDisplay.replace(/"/g, '""')}"`,
      sale.totalAmount,
      `"${sale.paymentType === "Self" ? "Self" : "Finance"}"`,
      `"${sale.paymentMode === "Both" ? `Both (Cash: ${sale.cashAmount || 0}, Bank: ${sale.bankAmount || 0})` : sale.paymentMode || "Cash"}"`,
      sale.financeAmount,
      `"${(sale.financer || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_overview_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const tableRowsHtml = filteredSales.map((sale) => `
      <tr>
        <td>${sale.createdAt}</td>
        <td>${sale.branchName}</td>
        <td>${sale.customerName}</td>
        <td>${sale.modelDisplay}</td>
        <td class="text-right">₹${sale.totalAmount.toLocaleString("en-IN")}</td>
        <td>${sale.paymentType === "Self" ? "Self" : "Finance"}</td>
        <td>${sale.paymentMode === "Both" ? `Both (Cash: ₹${(sale.cashAmount || 0).toLocaleString("en-IN")} + Bank: ₹${(sale.bankAmount || 0).toLocaleString("en-IN")})` : sale.paymentMode || "Cash"}</td>
        <td class="text-right">₹${sale.financeAmount.toLocaleString("en-IN")}</td>
        <td>${sale.financer || "—"}</td>
      </tr>
    `).join("");

    const totalVolume = filteredSales.length;

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Branch</th>
            <th>Customer</th>
            <th>Model</th>
            <th class="text-right">Total Amount</th>
            <th>Payment Type</th>
            <th>Payment Mode</th>
            <th class="text-right">Finance Amount</th>
            <th>Financer</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml || '<tr><td colspan="9" class="text-center">No sales reports found.</td></tr>'}
        </tbody>
      </table>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.write(`
      <html>
        <head>
          <title>Sales Overview Report</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              color: #1e293b;
              margin: 40px;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 24px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 16px;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 6px 0;
              color: #0f172a;
            }
            .meta {
              font-size: 13px;
              color: #64748b;
              margin: 0;
            }
            .kpi-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 10px 16px;
              background-color: #f8fafc;
              text-align: right;
            }
            .kpi-label {
              font-size: 11px;
              text-transform: uppercase;
              font-weight: 600;
              color: #64748b;
              margin: 0;
            }
            .kpi-value {
              font-size: 20px;
              font-weight: 700;
              color: #0f172a;
              margin: 2px 0 0 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th {
              background-color: #f8fafc;
              color: #475569;
              font-weight: 600;
              text-align: left;
              border-bottom: 2px solid #e2e8f0;
            }
            th, td {
              padding: 8px 10px;
              border-bottom: 1px solid #f1f5f9;
            }
            td.text-center { text-align: center; }
            td.text-right { text-align: right; }
            th.text-center { text-align: center; }
            th.text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h1>Sales Overview Report</h1>
              <p class="meta">
                Generated on ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}<br />
                Filters applied: Branch - ${selectedBranchId === "ALL" ? "All" : branches.find(b => b.id === selectedBranchId)?.name || "Selected"}, 
                Month - ${selectedMonth === "ALL" ? "All" : formatPeriodLabel(selectedMonth)}, 
                Financer - ${selectedFinancer === "ALL" ? "All" : selectedFinancer}, 
                Model - ${selectedModel === "ALL" ? "All" : selectedModel}
              </p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">Total Sales</p>
              <p class="kpi-value">${totalVolume} Units</p>
            </div>
          </div>
          ${tableHtml}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  if (!mounted) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="text-slate-500 font-medium animate-pulse">Loading sales data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Aligned Compact KPI Card */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">All Sale Reports</h1>
          <p className="mt-2 text-slate-500">Vehicle sales from all branches</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Export Reports
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${exportOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-100 bg-white py-1 shadow-lg ring-1 ring-black/5 z-20 origin-top-right transition-all">
                  <button
                    onClick={() => {
                      handleExportCSV();
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download as CSV
                  </button>
                  <button
                    onClick={() => {
                      handleExportPDF();
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download as PDF
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Compact KPI Stat Card */}
          <div className="w-full sm:w-48">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Sales</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900">{filteredSales.length}</p>
              </div>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wide">
                Units
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Form Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Dealership Branch
          </span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Month
          </span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
          >
            <option value="ALL">All Months</option>
            {monthOptions.map((m) => {
              const [year, month] = m.split("-");
              const date = new Date(parseInt(year), parseInt(month) - 1, 1);
              const monthLabel = date.toLocaleString("en-US", { month: "long", year: "numeric" });
              return (
                <option key={m} value={m}>
                  {monthLabel}
                </option>
              );
            })}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Financer
          </span>
          <select
            value={selectedFinancer}
            onChange={(e) => setSelectedFinancer(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
          >
            <option value="ALL">All Financers</option>
            {financerOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Vehicle Model
          </span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
          >
            <option value="ALL">All Models</option>
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Approval Status
          </span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
      </div>

      {/* Reports Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3.5 font-semibold">Date</th>
              <th className="px-4 py-3.5 font-semibold">Branch</th>
              <th className="px-4 py-3.5 font-semibold">Customer</th>
              <th className="px-4 py-3.5 font-semibold">Model</th>
              <th className="px-4 py-3.5 font-semibold">Total Amount</th>
              <th className="px-4 py-3.5 font-semibold">Finance Amount</th>
              <th className="px-4 py-3.5 font-semibold">Financer</th>
              <th className="px-4 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No sales reports found matching criteria.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  onClick={() => router.push(`/admin/sales/${sale.id}`)}
                  className="hover:bg-slate-50/50 transition cursor-pointer"
                >
                  <td className="px-4 py-4 text-slate-600">
                    {formatDate(sale.createdAt)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{sale.branchName}</td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{sale.customerName}</div>
                    <div className="text-xs text-slate-500">
                      {sale.paymentMode === "Both"
                        ? `Both (Cash: ${formatINR(sale.cashAmount || 0)} + Bank: ${formatINR(sale.bankAmount || 0)})`
                        : sale.paymentMode || "Cash"}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{sale.modelDisplay}</td>
                  <td className="px-4 py-4 font-medium text-slate-900">
                    {formatINR(sale.totalAmount)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatINR(sale.financeAmount)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {sale.paymentType === "Self" ? (
                      <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/10">
                        Self
                      </span>
                    ) : (
                      sale.financer || "—"
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        sale.status === "APPROVED"
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : sale.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}
                    >
                      {sale.status === "APPROVED"
                        ? "Approved"
                        : sale.status === "PENDING"
                        ? "Pending"
                        : "Rejected"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
