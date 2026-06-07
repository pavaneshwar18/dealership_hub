"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
      return true;
    });
  }, [initialSales, selectedBranchId, selectedMonth, selectedFinancer, selectedModel]);

  return (
    <div className="space-y-6">
      {/* Header with Title and Aligned Compact KPI Card */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">All Sale Reports</h1>
          <p className="mt-2 text-slate-500">Vehicle sales from all branches</p>
        </div>
        
        {/* Compact KPI Stat Card */}
        <div className="w-full sm:w-56 shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Sales</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{filteredSales.length}</p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wide">
              Units
            </span>
          </div>
        </div>
      </div>

      {/* Filters Form Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              <th className="px-4 py-3.5 font-semibold text-right">Action</th>
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
                <tr key={sale.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-4 text-slate-600">
                    {formatDate(sale.createdAt)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{sale.branchName}</td>
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    {sale.customerName}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{sale.modelDisplay}</td>
                  <td className="px-4 py-4 font-medium text-slate-900">
                    {formatINR(sale.totalAmount)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatINR(sale.financeAmount)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {sale.financer || "—"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/admin/sales/${sale.id}`}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      View
                    </Link>
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
