"use client";

import { useState, useMemo, useEffect } from "react";
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
  paymentType?: string;
  paymentMode?: string;
  modelName: string;
  modelVariant?: string | null;
};

type AdminModelAnalyticsClientProps = {
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

function getChartColor(index: number): string {
  if (index < CHART_COLORS.length) {
    return CHART_COLORS[index];
  }
  const hue = Math.floor((index * 137.5) % 360);
  return `hsl(${hue}, 70%, 55%)`;
}

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

export function AdminModelAnalyticsClient({ initialSales }: AdminModelAnalyticsClientProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
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
  const [exportOpen, setExportOpen] = useState(false);

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
      // For Model Analytics, we include all sales (cash + finance)

      if (periodType === "YEAR") {
        return getFinancialYear(s.createdAt) === selectedPeriod;
      } else {
        return s.createdAt.slice(0, 7) === selectedPeriod;
      }
    });
  }, [initialSales, periodType, selectedPeriod]);

  // Calculate stats aggregated by financer
  const stats = useMemo(() => {
    const groups: Record<string, { count: number; totalAmount: number }> = {};
    filteredSales.forEach((s) => {
      let name = s.modelName.trim();
      if (s.modelName.trim().toLowerCase() === "wego" && s.modelVariant) {
        name = `${s.modelName} ${s.modelVariant.trim()}`;
      }
      if (!groups[name]) {
        groups[name] = { count: 0, totalAmount: 0 };
      }
      groups[name].count++;
      groups[name].totalAmount += s.totalAmount;
    });

    const list = Object.entries(groups).map(([name, g]) => ({
      name,
      count: g.count,
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
      const color = getChartColor(i);
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

  const handleExportCSV = () => {
    const headers = ["Model", "Units Sold", "Share (%)", "Total Revenue (INR)", "Avg per Vehicle (INR)"];
    const rows = stats.map((stat) => {
      const avgRevenue = stat.count > 0 ? stat.totalAmount / stat.count : 0;
      return [
        `"${stat.name.replace(/"/g, '""')}"`,
        stat.count,
        `${stat.percentage.toFixed(2)}%`,
        stat.totalAmount,
        avgRevenue
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `model_analytics_${selectedPeriod.toLowerCase().replace(/[\s-]/g, '_')}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const pieChartSvgHtml = donutSlices.map(slice => `
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="transparent"
        stroke="${slice.color}"
        stroke-width="12"
        stroke-dasharray="${slice.strokeDasharray}"
        stroke-dashoffset="${slice.strokeDashoffset}"
      />
    `).join("");

    const legendHtml = donutSlices.map(slice => `
      <div class="legend-item">
        <span class="legend-color" style="background-color: ${slice.color}"></span>
        <span class="legend-name">${slice.name}</span>
        <span class="legend-val">${slice.count} units (${slice.percentage.toFixed(1)}%)</span>
      </div>
    `).join("");

    const barChartHtml = stats.map((stat, i) => {
      const color = getChartColor(i);
      const widthPercent = `${(stat.count / maxCount) * 100}%`;
      return `
        <div class="bar-container">
          <div class="bar-header">
            <span>${stat.name}</span>
            <strong>${stat.count} units</strong>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${widthPercent}; background-color: ${color};"></div>
          </div>
        </div>
      `;
    }).join("");

    const tableRowsHtml = stats.map((stat) => {
      const avgRevenue = stat.count > 0 ? stat.totalAmount / stat.count : 0;
      return `
        <tr>
          <td><strong>${stat.name}</strong></td>
          <td class="text-center">${stat.count}</td>
          <td class="text-center"><span class="badge">${stat.percentage.toFixed(1)}%</span></td>
          <td class="text-right">₹${stat.totalAmount.toLocaleString("en-IN")}</td>
          <td class="text-right">₹${avgRevenue.toLocaleString("en-IN")}</td>
        </tr>
      `;
    }).join("");

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
          <title>Model Analytics Report</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              color: #1e293b;
              margin: 40px;
            }
            .header {
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
            .charts-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              margin-bottom: 32px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 20px;
              background-color: #fff;
            }
            .card-title {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin: 0 0 4px 0;
            }
            .card-sub {
              font-size: 11px;
              color: #64748b;
              margin: 0 0 16px 0;
            }
            .donut-container {
              display: flex;
              align-items: center;
              gap: 24px;
            }
            .donut-svg {
              width: 120px;
              height: 120px;
              transform: rotate(-90deg);
              flex-shrink: 0;
            }
            .donut-legend {
              flex-grow: 1;
            }
            .legend-item {
              display: flex;
              align-items: center;
              font-size: 11px;
              margin-bottom: 6px;
            }
            .legend-color {
              width: 10px;
              height: 10px;
              border-radius: 50%;
              margin-right: 8px;
              display: inline-block;
              flex-shrink: 0;
            }
            .legend-name {
              flex-grow: 1;
              color: #475569;
            }
            .legend-val {
              font-weight: 600;
              color: #0f172a;
              margin-left: 12px;
            }
            .bar-container {
              margin-bottom: 12px;
            }
            .bar-header {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 4px;
              color: #475569;
              font-weight: 600;
            }
            .bar-track {
              height: 10px;
              background-color: #f1f5f9;
              border-radius: 9999px;
              overflow: hidden;
            }
            .bar-fill {
              height: 100%;
              border-radius: 9999px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-top: 16px;
            }
            th {
              background-color: #f8fafc;
              color: #475569;
              font-weight: 600;
              text-align: left;
              border-bottom: 2px solid #e2e8f0;
            }
            th, td {
              padding: 10px 12px;
              border-bottom: 1px solid #f1f5f9;
            }
            td.text-center { text-align: center; }
            td.text-right { text-align: right; }
            th.text-center { text-align: center; }
            th.text-right { text-align: right; }
            .badge {
              background-color: #eff6ff;
              color: #1d4ed8;
              padding: 2px 8px;
              border-radius: 9999px;
              font-weight: 600;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Model Analytics Report</h1>
            <p class="meta">
              Generated on ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}<br />
              Period: ${formatPeriodLabel(selectedPeriod)}
            </p>
          </div>

          <div class="charts-grid">
            <div class="card">
              <h3 class="card-title">Share of Total Sales</h3>
              <p class="card-sub">Model volume share</p>
              <div class="donut-container">
                <svg class="donut-svg" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="#f1f5f9" stroke-width="12" />
                  ${pieChartSvgHtml}
                </svg>
                <div class="donut-legend">
                  ${legendHtml}
                </div>
              </div>
            </div>

            <div class="card">
              <h3 class="card-title">Sales Volume by Model</h3>
              <p class="card-sub">Units sold comparison</p>
              <div>
                ${barChartHtml}
              </div>
            </div>
          </div>

          <h3>Comparison Matrix Table</h3>
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th class="text-center">Units Sold</th>
                <th class="text-center">Share (%)</th>
                <th class="text-right">Total Revenue (INR)</th>
                <th class="text-right">Avg per Vehicle (INR)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml || '<tr><td colspan="5" class="text-center">No sales records found.</td></tr>'}
            </tbody>
          </table>
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
        <div className="text-slate-500 font-medium animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Frame Selectors */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
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

        <div className="flex flex-wrap items-center gap-4">
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

          <div className="flex items-center gap-2.5">
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
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Panel */}
      {stats.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pie Donut Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Share of Total Sales</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sales volume share for {formatPeriodLabel(selectedPeriod)}</p>
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
              <h2 className="text-base font-bold text-slate-900">Sales volume by Model</h2>
              <p className="text-xs text-slate-500 mt-0.5">Total units compared across models</p>
            </div>
            <div className="py-4 space-y-4">
              {stats.map((stat, i) => {
                const color = getChartColor(i);
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
          No sales records found for {formatPeriodLabel(selectedPeriod)}.
        </div>
      )}

      {/* Comparison Matrix Table */}
      {stats.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Model</th>
                <th className="px-5 py-3.5 font-semibold text-center">Units Sold</th>
                <th className="px-5 py-3.5 font-semibold text-center">Share (%)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Total Revenue (INR)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Avg per Vehicle (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((stat) => {
                const avgRevenue = stat.count > 0 ? stat.totalAmount / stat.count : 0;
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
                      {formatINR(stat.totalAmount)}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-600">
                      {formatINR(avgRevenue)}
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
