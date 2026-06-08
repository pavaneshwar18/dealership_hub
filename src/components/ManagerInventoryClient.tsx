"use client";

import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import type { SessionUser } from "@/lib/auth";

type StockItem = {
  id: string;
  chassisNumber: string;
  engineNumber: string;
  modelName: string;
  modelVariant: string | null;
  color: string | null;
  receivedDate: string; // YYYY-MM-DD
};

type ExchangeItem = {
  id: string;
  modelName: string;
  yearModel: string;
  valuation: number;
  status: string;
  receivedDate: string; // YYYY-MM-DD
  saleReportId: string;
  tradedInFrom: string;
};

type ManagerInventoryClientProps = {
  initialStock: StockItem[];
  initialExchangeStock: ExchangeItem[];
  user: SessionUser;
};

export function ManagerInventoryClient({ initialStock, initialExchangeStock, user }: ManagerInventoryClientProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState<"new" | "exchange">("new");
  const [exchangeStock] = useState<ExchangeItem[]>(initialExchangeStock);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterModel, setFilterModel] = useState("ALL");

  function calculateDaysOld(receivedDateStr: string): number {
    const diffTime = Math.abs(new Date().getTime() - new Date(receivedDateStr).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Calculate statistics
  const stats = useMemo(() => {
    if (activeTab === "new") {
      let agingUnits = 0;
      initialStock.forEach((s) => {
        const days = calculateDaysOld(s.receivedDate);
        if (days > 60) agingUnits++;
      });

      return {
        total: initialStock.length,
        agingUnits,
      };
    } else {
      return {
        total: exchangeStock.length,
        valuationTotal: exchangeStock.reduce((acc, curr) => acc + curr.valuation, 0),
      };
    }
  }, [initialStock, exchangeStock, activeTab]);

  // Unique models options
  const modelOptions = useMemo(() => {
    const models = new Set<string>();
    if (activeTab === "new") {
      initialStock.forEach((s) => models.add(s.modelName));
    } else {
      exchangeStock.forEach((s) => models.add(s.modelName));
    }
    return Array.from(models).sort();
  }, [initialStock, exchangeStock, activeTab]);

  // Filtered stock items
  const filteredStock = useMemo(() => {
    return initialStock.filter((item) => {
      if (filterModel !== "ALL" && item.modelName !== filterModel) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const chassisMatch = item.chassisNumber.toLowerCase().includes(query);
        const engineMatch = item.engineNumber.toLowerCase().includes(query);
        const colorMatch = item.color?.toLowerCase().includes(query) ?? false;
        if (!chassisMatch && !engineMatch && !colorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [initialStock, filterModel, searchQuery]);

  // Filtered exchange stock items
  const filteredExchangeStock = exchangeStock;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar user={user} />
        <div className="flex h-96 items-center justify-center">
          <div className="text-slate-500 font-medium animate-pulse">Loading showroom inventory...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Showroom Stock</h1>
            <p className="mt-2 text-slate-500">Available vehicle inventory at {user.branchName} branch</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex border-b border-slate-200">
          <button
            onClick={() => {
              setActiveTab("new");
              setFilterModel("ALL");
              setSearchQuery("");
            }}
            className={`border-b-2 px-6 py-3 text-sm font-semibold transition ${
              activeTab === "new"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            New Vehicles
          </button>
          <button
            onClick={() => {
              setActiveTab("exchange");
              setFilterModel("ALL");
              setSearchQuery("");
            }}
            className={`border-b-2 px-6 py-3 text-sm font-semibold transition ${
              activeTab === "exchange"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            Exchange Vehicles
          </button>
        </div>

        {/* Showroom KPIs */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeTab === "new" ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Showroom Units</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{stats.total}</p>
                  <p className="mt-1 text-xs text-slate-400">Total vehicles available for sale on your floor</p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold text-sm">
                  Units
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Aging Showroom Stock (&gt;60 days)</p>
                  <p className="mt-1 text-3xl font-bold text-rose-600">{"agingUnits" in stats ? stats.agingUnits : 0}</p>
                  <p className="mt-1 text-xs text-slate-400">Slow-moving stock requiring sales attention</p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-700 font-bold text-sm">
                  Aging
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Exchange Units</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{stats.total}</p>
                  <p className="mt-1 text-xs text-slate-400">Available traded-in vehicles on your floor</p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold text-sm">
                  Units
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Exchange Valuation</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-600">
                    ₹{"valuationTotal" in stats ? stats.valuationTotal?.toLocaleString("en-IN") : 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Total trade-in capital on showroom floor</p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-sm">
                  Valuation
                </span>
              </div>
            </>
          )}
        </div>

        {/* Filter Bar */}
        {activeTab === "new" && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter by Model</span>
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 bg-white"
              >
                <option value="ALL">All Models</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Code / Details</span>
              <input
                type="text"
                placeholder="Chassis Number / Engine / Color"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
              />
            </label>
          </div>
        )}

        {activeTab === "new" ? (
          /* Stock List Table */
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Intake Date</th>
                  <th className="px-4 py-3.5 font-semibold">Days in Showroom</th>
                  <th className="px-4 py-3.5 font-semibold">Model / Variant</th>
                  <th className="px-4 py-3.5 font-semibold">Chassis Number</th>
                  <th className="px-4 py-3.5 font-semibold">Engine Number</th>
                  <th className="px-4 py-3.5 font-semibold">Color</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No showroom stock found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((item) => {
                    const ageDays = calculateDaysOld(item.receivedDate);

                    // Color badges for aging stock
                    let ageBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    if (ageDays > 90) {
                      ageBadgeClass = "bg-rose-50 text-rose-700 border-rose-100 animate-pulse";
                    } else if (ageDays > 60) {
                      ageBadgeClass = "bg-orange-50 text-orange-700 border-orange-100";
                    } else if (ageDays > 30) {
                      ageBadgeClass = "bg-amber-50 text-amber-700 border-amber-100";
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition border-t border-slate-100">
                        <td className="px-4 py-4 text-slate-600">{item.receivedDate}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${ageBadgeClass}`}>
                            {ageDays} Days Old
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{item.modelName}</div>
                          <div className="text-xs text-slate-500">{item.modelVariant || "Standard"}</div>
                        </td>
                        <td className="px-4 py-4 font-mono font-medium text-slate-800">{item.chassisNumber}</td>
                        <td className="px-4 py-4 font-mono text-slate-600">{item.engineNumber}</td>
                        <td className="px-4 py-4 text-slate-600">{item.color || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Exchange Stock List Table */
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Traded Date</th>
                  <th className="px-4 py-3.5 font-semibold">Model</th>
                  <th className="px-4 py-3.5 font-semibold">Year Model</th>
                  <th className="px-4 py-3.5 font-semibold">Valuation</th>
                  <th className="px-4 py-3.5 font-semibold">Source Sale (Customer)</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExchangeStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No exchange showroom stock found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredExchangeStock.map((item) => {
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition border-t border-slate-100">
                        <td className="px-4 py-4 text-slate-600">{item.receivedDate}</td>
                        <td className="px-4 py-4 font-semibold text-slate-900">{item.modelName}</td>
                        <td className="px-4 py-4 text-slate-600 font-medium">{item.yearModel}</td>
                        <td className="px-4 py-4 font-mono font-semibold text-emerald-600">
                          ₹{item.valuation.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{item.tradedInFrom}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Available
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
