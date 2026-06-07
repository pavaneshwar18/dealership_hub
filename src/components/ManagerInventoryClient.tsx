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

type ManagerInventoryClientProps = {
  initialStock: StockItem[];
  user: SessionUser;
};

export function ManagerInventoryClient({ initialStock, user }: ManagerInventoryClientProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterModel, setFilterModel] = useState("ALL");

  function calculateDaysOld(receivedDateStr: string): number {
    const diffTime = Math.abs(new Date().getTime() - new Date(receivedDateStr).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Calculate statistics
  const stats = useMemo(() => {
    let agingUnits = 0;
    initialStock.forEach((s) => {
      const days = calculateDaysOld(s.receivedDate);
      if (days > 60) agingUnits++;
    });

    return {
      total: initialStock.length,
      agingUnits,
    };
  }, [initialStock]);

  // Unique models options
  const modelOptions = useMemo(() => {
    const models = new Set<string>();
    initialStock.forEach((s) => models.add(s.modelName));
    return Array.from(models).sort();
  }, [initialStock]);

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

        {/* Showroom KPIs */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <p className="mt-1 text-3xl font-bold text-rose-600">{stats.agingUnits}</p>
              <p className="mt-1 text-xs text-slate-400">Slow-moving stock requiring sales attention</p>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-700 font-bold text-sm">
              Aging
            </span>
          </div>
        </div>

        {/* Filter Bar */}
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

        {/* Stock List Table */}
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
      </main>
    </div>
  );
}
