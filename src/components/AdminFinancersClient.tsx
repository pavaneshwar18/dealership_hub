"use client";

import { useState, useMemo } from "react";
import { formatINR } from "@/lib/format";

type SaleItem = {
  id: string;
  createdAt: string; // YYYY-MM-DD
  branchId: string;
  branchName: string;
  customerName: string;
  totalAmount: number;
  financeAmount: number;
  financer: string;
};

type AdminFinancersClientProps = {
  initialSales: SaleItem[];
};

const CHART_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f43f5e", // rose
  "#6b7280", // gray
];

// Helper to determine Indian Financial Year (FY YYYY-YY) from date string YYYY-MM-DD
function getFinancialYear(dateStr: string): string {
  const [yearStr, monthStr] = dateStr.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr); // 1-indexed
  if (month >= 4) {
    return `FY ${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `FY ${year - 1}-${String(year).slice(-2)}`;
  }
}

export function AdminFinancersClient({ initialSales }: AdminFinancersClientProps) {
  // Get current date string in IST timezone (YYYY-MM-DD)
  const currentISTDate = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    const year = parts.find((p) => p.type === "year")?.value;
    return `${year}-${month}-${day}`;
  }, []);

  const currentFinancialYear = useMemo(() => getFinancialYear(currentISTDate), [currentISTDate]);
  const currentMonthOnly = useMemo(() => currentISTDate.slice(0, 7), [currentISTDate]);

  // Dashboard Filters State
  const [periodType, setPeriodType] = useState<"YEAR" | "MONTH">("YEAR");
  const [selectedPeriod, setSelectedPeriod] = useState(currentFinancialYear);

  // Toggle period type and reset default selections safely
  function handlePeriodTypeChange(type: "YEAR" | "MONTH") {
    setPeriodType(type);
    setSelectedPeriod(type === "YEAR" ? currentFinancialYear : currentMonthOnly);
  }

  // Extract unique Financial Year options from all sales, sorted descending
  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    years.add(currentFinancialYear);
    initialSales.forEach((s) => {
      years.add(getFinancialYear(s.createdAt));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [initialSales, currentFinancialYear]);

  // Extract unique Month options (YYYY-MM) from all sales, sorted descending
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonthOnly);
    initialSales.forEach((s) => {
      months.add(s.createdAt.slice(0, 7));
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [initialSales, currentMonthOnly]);

  // Filter sales matching selected period
  const filteredSales = useMemo(() => {
    return initialSales.filter((s) => {
      if (periodType === "YEAR") {
        return getFinancialYear(s.createdAt) === selectedPeriod;
      } else {
        return s.createdAt.slice(0, 7) === selectedPeriod;
      }
    });
  }, [initialSales, periodType, selectedPeriod]);

  // Calculate stats aggregated by financer
  const stats = useMemo(() => {
    const groups: Record<string, { count: number; financeAmount: number; totalAmount: number }> = {};
    filteredSales.forEach((s) => {
      const name = s.financer.trim() || "Self / Cash";
      if (!groups[name]) {
        groups[name] = { count: 0, financeAmount: 0, totalAmount: 0 };
      }
      groups[name].count++;
      groups[name].financeAmount += s.financeAmount;
      groups[name].totalAmount += s.totalAmount;
    });

    const list = Object.entries(groups).map(([name, g]) => ({
      name,
      count: g.count,
      financeAmount: g.financeAmount,
      totalAmount: g.totalAmount,
      percentage: filteredSales.length > 0 ? (g.count / filteredSales.length) * 100 : 0,
    }));

    // Sort by volume count descending
    return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [filteredSales]);

  // Pie/Donut slice calculations
  const donutSlices = useMemo(() => {
    let accumulatedPercentage = 0;
    const circumference = 314.16; // 2 * PI * 50

    return stats.map((stat, i) => {
      const color = CHART_COLORS[i % CHART_COLORS.length];
      const strokeLength = (stat.percentage / 100) * circumference;
      const strokeDashoffset = -(accumulatedPercentage / 100) * circumference;
      accumulatedPercentage += stat.percentage;

      return {
        ...stat,
        color,
        strokeDasharray: `${strokeLength} ${circumference - strokeLength}`,
        strokeDashoffset,
      };
    });
  }, [stats]);

  const maxCount = useMemo(() => {
    return Math.max(...stats.map((s) => s.count), 1);
  }, [stats]);

  // Format month period display helper (e.g. "2026-06" to "June 2026")
  function formatPeriodLabel(p: string): string {
    if (p.startsWith("FY ")) return p;
    const [year, month] = p.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  }

  return (
    <div className="space-y-6">
      {/* Time Frame Selectors */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 self-start">
          <button
            onClick={() => handlePeriodTypeChange("YEAR")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              periodType === "YEAR"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-850"
            }`}
          >
            Financial Year
          </button>
          <button
            onClick={() => handlePeriodTypeChange("MONTH")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              periodType === "MONTH"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-850"
            }`}
          >
            Month
          </button>
        </div>

        <label className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">Select Period:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 bg-white"
          >
            {periodType === "YEAR"
              ? yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))
              : monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {formatPeriodLabel(m)}
                  </option>
                ))}
          </select>
        </label>
      </div>

      {/* Visual Analytics Charts Panel */}
      {stats.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pie Donut Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Share of Total Units</h2>
              <p className="text-xs text-slate-500 mt-0.5">Financing volume share for {formatPeriodLabel(selectedPeriod)}</p>
            </div>
            <div className="py-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative shrink-0">
                <svg viewBox="0 0 120 120" className="w-40 h-40 transform -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                  {donutSlices.map((slice) => (
                    <circle
                      key={slice.name}
                      cx="60"
                      cy="60"
                      r="50"
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth="12"
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      className="transition-all duration-300 hover:stroke-[14] cursor-pointer"
                    >
                      <title>{slice.name}: {slice.count} units ({slice.percentage.toFixed(1)}%)</title>
                    </circle>
                  ))}
                </svg>
              </div>
              {/* Pie Chart Legend */}
              <div className="grid grid-cols-1 gap-2.5 text-xs w-full">
                {donutSlices.map((slice) => (
                  <div key={slice.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium text-slate-700 min-w-0">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                      <span className="truncate">{slice.name}</span>
                    </span>
                    <span className="font-semibold text-slate-900 whitespace-nowrap">
                      {slice.count} units ({slice.percentage.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Chart representing Total Units */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Financed Units volume</h2>
              <p className="text-xs text-slate-500 mt-0.5">Total units compared across providers</p>
            </div>
            <div className="py-4 space-y-4">
              {stats.map((stat, i) => {
                const color = CHART_COLORS[i % CHART_COLORS.length];
                const widthPercent = `${(stat.count / maxCount) * 100}%`;

                return (
                  <div key={stat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate pr-2">{stat.name}</span>
                      <span className="text-slate-900 shrink-0">{stat.count} units</span>
                    </div>
                    <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: widthPercent, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          No financing records found for {formatPeriodLabel(selectedPeriod)}.
        </div>
      )}

      {/* Comparison Matrix Table */}
      {stats.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Financing Partner</th>
                <th className="px-5 py-3.5 font-semibold text-center">Units Financed</th>
                <th className="px-5 py-3.5 font-semibold text-center">Share (%)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Total Financed (INR)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Avg per Vehicle (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((stat) => {
                const avgFinance = stat.count > 0 ? stat.financeAmount / stat.count : 0;
                return (
                  <tr key={stat.name} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4 font-semibold text-slate-900">{stat.name}</td>
                    <td className="px-5 py-4 text-center font-medium text-slate-700">{stat.count}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        {stat.percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-900">
                      {formatINR(stat.financeAmount)}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-600">
                      {formatINR(avgFinance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
