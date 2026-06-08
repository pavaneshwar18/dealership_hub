"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { formatINR, formatDate } from "@/lib/format";

type BranchItem = {
  id: string;
  name: string;
};

type DealershipExpense = {
  id: string;
  date: string;
  title: string;
  description: string | null;
  amount: number;
  category: string;
  recordedBy: { name: string };
  branch: { name: string } | null;
};

type LedgerItem = {
  id: string;
  date: string;
  type: "inflow" | "outflow";
  source: string;
  description: string;
  amount: number;
  branchName: string;
};

type FinancialStats = {
  totalSalesRevenue: number;
  totalServiceRevenue: number;
  totalPettyCashIn: number;
  totalPettyCashOut: number;
  totalGeneralExpenses: number;
  estimatedStaffSalaries: number;
  totalInflow: number;
  totalOutflow: number;
};

type StaffMember = {
  id: string;
  name: string;
  role: string;
  branchId: string;
};

type AdminFinancialsClientProps = {
  branches: BranchItem[];
  staff: StaffMember[];
};

export function AdminFinancialsClient({ branches, staff = [] }: AdminFinancialsClientProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Tab states: "overview" | "expenses" | "ledger"
  const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "ledger">("overview");

  // Get current date parts in IST
  const dateParams = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const month = parts.find((p) => p.type === "month")?.value || "01";
    const year = parts.find((p) => p.type === "year")?.value || "2026";
    const day = parts.find((p) => p.type === "day")?.value || "01";
    return {
      today: `${year}-${month}-${day}`,
      monthStart: `${year}-${month}-01`,
    };
  }, []);

  // Filter States
  const [selectedBranchId, setSelectedBranchId] = useState("ALL");
  const [fromDate, setFromDate] = useState(dateParams.monthStart);
  const [toDate, setToDate] = useState(dateParams.today);

  // Financial Data States
  const [expenses, setExpenses] = useState<DealershipExpense[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalSalesRevenue: 0,
    totalServiceRevenue: 0,
    totalPettyCashIn: 0,
    totalPettyCashOut: 0,
    totalGeneralExpenses: 0,
    estimatedStaffSalaries: 0,
    totalInflow: 0,
    totalOutflow: 0,
  });
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);

  // Add Expense Form States
  const [formDate, setFormDate] = useState(dateParams.today);
  const [formCategory, setFormCategory] = useState("Rent");
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBranchId, setFormBranchId] = useState("ALL");
  const [formStaffId, setFormStaffId] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Search filter for Unified Ledger
  const [ledgerSearch, setLedgerSearch] = useState("");

  // Filtered staff based on branch
  const formStaffOptions = useMemo(() => {
    if (formCategory !== "Salaries") return [];
    return staff.filter((s) => s.branchId === formBranchId);
  }, [staff, formCategory, formBranchId]);

  const categories = [
    "Rent",
    "Utilities",
    "Marketing",
    "Inventory",
    "Salaries",
    "Taxes",
    "Maintenance",
    "Other",
  ];

  // Fetch all financial data
  const fetchFinancials = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        branchId: selectedBranchId,
        from: fromDate,
        to: toDate,
      });

      const res = await fetch(`/api/admin/financials?${params.toString()}`);
      const data = await res.json();
      
      if (res.ok) {
        setExpenses(data.generalExpenses);
        setStats(data.stats);
        setLedgerItems(data.ledgerItems);
      } else {
        setError(data.error || "Failed to load financial records.");
      }
    } catch {
      setError("Network error connecting to financial services.");
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, fromDate, toDate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchFinancials();
    }
  }, [mounted, fetchFinancials]);

  const handleCategoryChange = (val: string) => {
    setFormCategory(val);
    setFormStaffId("");
    if (val === "Salaries") {
      setFormBranchId(""); // force branch selection
    } else {
      setFormBranchId("ALL");
    }
  };

  // Handle Form Submission to add new expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    if (!formTitle.trim()) {
      setFormError("Expense title is required.");
      setFormLoading(false);
      return;
    }

    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Enter a valid positive amount.");
      setFormLoading(false);
      return;
    }

    if (formCategory === "Salaries") {
      if (!formBranchId || formBranchId === "ALL") {
        setFormError("Please select a specific branch for salary expense.");
        setFormLoading(false);
        return;
      }
      if (!formStaffId) {
        setFormError("Please select an employee.");
        setFormLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/admin/financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          category: formCategory,
          title: formTitle.trim(),
          amount: parsedAmount,
          description: formDescription.trim(),
          branchId: formBranchId,
          staffId: formCategory === "Salaries" && formStaffId !== "" ? formStaffId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save expense.");
      } else {
        // Clear form fields
        setFormTitle("");
        setFormAmount("");
        setFormDescription("");
        setFormBranchId("ALL");
        setFormStaffId("");
        fetchFinancials(); // Refresh logs
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle deleting expense record
  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;

    try {
      const res = await fetch(`/api/admin/financials/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchFinancials();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete expense.");
      }
    } catch {
      alert("Network error deleting expense.");
    }
  };

  // Export Unified Ledger to CSV
  const handleExportCSV = () => {
    const sortedLedger = [...filteredLedger].reverse(); // chronologically (oldest first) for ledger CSV
    const headers = ["Date", "Branch", "Description", "Inflow (₹)", "Outflow (₹)", "Source"];
    
    const rows = sortedLedger.map((item) => [
      `"${formatDate(item.date)}"`,
      `"${item.branchName}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      item.type === "inflow" ? item.amount : 0,
      item.type === "outflow" ? item.amount : 0,
      `"${item.source}"`
    ]);

    const csvContent = [
      `"Dealership Unified Financial Ledger"`,
      `"Branch Filter","${selectedBranchId === "ALL" ? "All Branches" : branches.find((b) => b.id === selectedBranchId)?.name}"`,
      `"Date Range","${formatDate(fromDate)} to ${formatDate(toDate)}"`,
      ``,
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dealership_financial_ledger_${fromDate}_to_${toDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get color themes for category tags
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Rent":
        return "bg-purple-50 text-purple-700 border-purple-100";
      case "Utilities":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Marketing":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "Inventory":
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "Salaries":
        return "bg-green-50 text-green-700 border-green-100";
      case "Taxes":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "Maintenance":
        return "bg-orange-50 text-orange-700 border-orange-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  // Filtered Ledger Items based on search
  const filteredLedger = useMemo(() => {
    return ledgerItems.filter((item) => {
      const matchSearch =
        item.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        item.branchName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        item.source.toLowerCase().includes(ledgerSearch.toLowerCase());
      return matchSearch;
    });
  }, [ledgerItems, ledgerSearch]);

  const netProfit = stats.totalInflow - stats.totalOutflow;

  if (!mounted) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="text-slate-500 font-semibold animate-pulse">Loading financials...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Records</h1>
          <p className="mt-1 text-slate-500">
            Monitor overall dealership inflows, outflows, general overheads, and log company-wide expenses.
          </p>
        </div>
      </div>

      {/* Global Date & Branch Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Ledger Filters</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Branch scope
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
            >
              <option value="ALL">All Dealership Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
            />
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "overview"
              ? "border-blue-700 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Dealership Overview
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "expenses"
              ? "border-blue-700 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          General Overhead Logs
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "ledger"
              ? "border-blue-700 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Unified Ledger (Tally)
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-slate-500 font-semibold animate-pulse">Recalculating ledger sheets...</div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-rose-700 font-bold">{error}</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Net Profit Card */}
                <div
                  className={`rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
                    netProfit >= 0
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-rose-200 bg-rose-50/50"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Net Profit / Loss
                  </p>
                  <p
                    className={`text-2xl font-black mt-2 ${
                      netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {formatINR(netProfit)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Inflow - Outflow in date range
                  </p>
                </div>

                {/* Total Inflow Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Inflow (Credits)</p>
                  <p className="text-2xl font-black text-emerald-700 mt-2">
                    + {formatINR(stats.totalInflow)}
                  </p>
                  <div className="mt-2 space-y-0.5 text-[10px] font-semibold text-slate-500">
                    <div className="flex justify-between">
                      <span>Vehicle Sales:</span>
                      <span className="font-bold text-slate-700">{formatINR(stats.totalSalesRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Revenue:</span>
                      <span className="font-bold text-slate-700">{formatINR(stats.totalServiceRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Petty Cash In:</span>
                      <span className="font-bold text-slate-700">{formatINR(stats.totalPettyCashIn)}</span>
                    </div>
                  </div>
                </div>

                {/* Total Outflow Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Outflow (Debits)</p>
                  <p className="text-2xl font-black text-rose-700 mt-2">
                    - {formatINR(stats.totalOutflow)}
                  </p>
                  <div className="mt-2 space-y-0.5 text-[10px] font-semibold text-slate-500">
                    <div className="flex justify-between">
                      <span>General Overheads:</span>
                      <span className="font-bold text-slate-700">{formatINR(stats.totalGeneralExpenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Branch Expenses:</span>
                      <span className="font-bold text-slate-700">{formatINR(stats.totalPettyCashOut)}</span>
                    </div>
                  </div>
                </div>

                {/* Monthly Payroll commitments Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Payroll Overhead</p>
                  <p className="text-2xl font-black text-slate-800 mt-2">
                    {formatINR(stats.estimatedStaffSalaries)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Monthly base salary commitments for active staff
                  </p>
                </div>
              </div>

              {/* Progress bar ratio */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                  Cash Flow Ratio
                </h3>
                {stats.totalInflow === 0 && stats.totalOutflow === 0 ? (
                  <p className="text-xs text-slate-400 italic">No cash flow recorded for this range.</p>
                ) : (
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                      <span>Inflow (+{formatINR(stats.totalInflow)})</span>
                      <span>Outflow (-{formatINR(stats.totalOutflow)})</span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{
                          width: `${
                            (stats.totalInflow / (stats.totalInflow + stats.totalOutflow)) * 100
                          }%`,
                        }}
                        className="bg-emerald-500 h-full"
                        title="Inflow percentage"
                      />
                      <div
                        style={{
                          width: `${
                            (stats.totalOutflow / (stats.totalInflow + stats.totalOutflow)) * 100
                          }%`,
                        }}
                        className="bg-rose-500 h-full"
                        title="Outflow percentage"
                      />
                    </div>
                    <div className="mt-3 flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>
                        {((stats.totalInflow / (stats.totalInflow + stats.totalOutflow || 1)) * 100).toFixed(1)}% Inflow
                      </span>
                      <span>
                        {((stats.totalOutflow / (stats.totalInflow + stats.totalOutflow || 1)) * 100).toFixed(1)}% Outflow
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Inflow vs Outflow category summary breakdown */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* General overhead categories breakdown */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                    General Expenses Breakdown
                  </h3>
                  {expenses.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4">No general overhead expenses logged.</p>
                  ) : (
                    <div className="space-y-3">
                      {categories.map((cat) => {
                        const catTotal = expenses
                          .filter((e) => e.category === cat)
                          .reduce((sum, e) => sum + e.amount, 0);
                        const percent = stats.totalGeneralExpenses > 0 
                          ? (catTotal / stats.totalGeneralExpenses) * 100 
                          : 0;

                        if (catTotal === 0) return null;

                        return (
                          <div key={cat} className="space-y-1 text-xs">
                            <div className="flex justify-between font-semibold">
                              <span className="text-slate-600">{cat}</span>
                              <span className="text-slate-800 font-bold">{formatINR(catTotal)} ({percent.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${percent}%` }}
                                className="bg-blue-600 h-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Branches comparative snapshot */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                    Financial Activity By Branch
                  </h3>
                  <div className="space-y-4">
                    {branches.map((branch) => {
                      // Calculate ledger items for this branch
                      const branchIn = ledgerItems
                        .filter((l) => l.branchName === branch.name && l.type === "inflow")
                        .reduce((sum, l) => sum + l.amount, 0);
                      const branchOut = ledgerItems
                        .filter((l) => l.branchName === branch.name && l.type === "outflow")
                        .reduce((sum, l) => sum + l.amount, 0);

                      if (branchIn === 0 && branchOut === 0) return null;

                      return (
                        <div key={branch.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800">{branch.name}</span>
                            <span className={`font-black ${branchIn - branchOut >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                              {formatINR(branchIn - branchOut)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-1">
                            <span>In: <span className="text-emerald-600">+{formatINR(branchIn)}</span></span>
                            <span>Out: <span className="text-rose-600">-{formatINR(branchOut)}</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OVERHEAD EXPENSES LOGGING */}
          {activeTab === "expenses" && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Add Expense Form Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-fit">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                  Log New Overhead
                </h3>
                <form onSubmit={handleAddExpense} className="space-y-4 text-xs font-semibold">
                  <label className="block space-y-1">
                    <span className="text-slate-500">Date</span>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
                      required
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-slate-500">Category</span>
                    <select
                      value={formCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  {formCategory === "Salaries" && (
                    <>
                      <label className="block space-y-1">
                        <span className="text-slate-500">Branch *</span>
                        <select
                          value={formBranchId}
                          onChange={(e) => {
                            setFormBranchId(e.target.value);
                            setFormStaffId("");
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition bg-white"
                          required
                        >
                          <option value="">Select Branch</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1">
                        <span className="text-slate-500">Paid to Employee *</span>
                        <select
                          value={formStaffId}
                          onChange={(e) => setFormStaffId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition bg-white"
                          required
                          disabled={!formBranchId}
                        >
                          <option value="">{formBranchId ? "Select Employee" : "Choose Branch First"}</option>
                          {formStaffOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.role})
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}

                  <label className="block space-y-1">
                    <span className="text-slate-500">Expense Title</span>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. May Rent payment"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
                      required
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-slate-500">Amount (₹)</span>
                    <input
                      type="number"
                      step="any"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
                      required
                    />
                  </label>

                  {formCategory !== "Salaries" && (
                    <label className="block space-y-1">
                      <span className="text-slate-500">Attribute to Branch (Optional)</span>
                      <select
                        value={formBranchId}
                        onChange={(e) => setFormBranchId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition bg-white"
                      >
                        <option value="ALL">Entire Dealership HQ</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="block space-y-1">
                    <span className="text-slate-500">Description / Notes</span>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="e.g. Paid online transaction ID: Txn12345"
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition resize-none"
                    />
                  </label>

                  {formError && (
                    <div className="rounded-lg bg-rose-50 border border-rose-100 p-2 text-rose-700 text-xs font-semibold">
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {formLoading ? "Saving..." : "Log Expense Entry"}
                  </button>
                </form>
              </div>

              {/* Expense Table List */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden lg:col-span-2">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    General Expense Ledger
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    {expenses.length} Records
                  </span>
                </div>
                <div className="overflow-x-auto text-xs">
                  <table className="min-w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Date</th>
                        <th className="px-5 py-3 font-semibold">Details</th>
                        <th className="px-5 py-3 font-semibold">Category</th>
                        <th className="px-5 py-3 font-semibold">Branch</th>
                        <th className="px-5 py-3 font-semibold text-right">Amount</th>
                        <th className="px-5 py-3 font-semibold text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-semibold">
                            No general expenses logged for the selected period.
                          </td>
                        </tr>
                      ) : (
                        expenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-5 py-4 font-semibold text-slate-700 whitespace-nowrap">
                              {formatDate(exp.date)}
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-900">{exp.title}</p>
                              {exp.description && (
                                <p className="text-[10px] text-slate-400 font-semibold">{exp.description}</p>
                              )}
                              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Recorded by: {exp.recordedBy.name}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-block border px-2 py-0.5 rounded-full text-[10px] font-bold ${getCategoryColor(exp.category)}`}>
                                {exp.category}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600 text-[10px]">
                                {exp.branch?.name || "Dealership HQ"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right font-black text-rose-700 whitespace-nowrap">
                              - {formatINR(exp.amount)}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="text-slate-400 hover:text-rose-600 transition"
                                title="Delete expense"
                              >
                                <svg
                                  className="h-4.5 w-4.5 mx-auto"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UNIFIED LEDGER (MINI-TALLY LEDGER) */}
          {activeTab === "ledger" && (
            <div className="space-y-4">
              {/* Ledger Controls */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search ledger entries by description or branch..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
                  />
                  <svg
                    className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition flex items-center justify-center gap-2"
                >
                  <svg
                    className="h-4.5 w-4.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Export Tally Ledger (CSV)
                </button>
              </div>

              {/* Tally Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto text-xs">
                  <table className="min-w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5 font-bold">Date</th>
                        <th className="px-5 py-3.5 font-bold">Scope / Branch</th>
                        <th className="px-5 py-3.5 font-bold">Journal Entry Description</th>
                        <th className="px-5 py-3.5 font-bold">Type</th>
                        <th className="px-5 py-3.5 font-bold text-right">Credit (Inflow)</th>
                        <th className="px-5 py-3.5 font-bold text-right">Debit (Outflow)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLedger.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-semibold">
                            No journal transactions match your search filters.
                          </td>
                        </tr>
                      ) : (
                        filteredLedger.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-5 py-4 font-semibold text-slate-700 whitespace-nowrap">
                              {formatDate(item.date)}
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600 text-[10px]">
                                {item.branchName}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-900">{item.description}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                item.type === "inflow"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-rose-50 text-rose-700 border border-rose-100"
                              }`}>
                                {item.type === "inflow" ? "Credit" : "Debit"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right font-black text-emerald-700 whitespace-nowrap">
                              {item.type === "inflow" ? `+ ${formatINR(item.amount)}` : ""}
                            </td>
                            <td className="px-5 py-4 text-right font-black text-rose-700 whitespace-nowrap">
                              {item.type === "outflow" ? `- ${formatINR(item.amount)}` : ""}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 text-slate-800 font-extrabold text-xs">
                      <tr>
                        <td colSpan={3} className="px-5 py-4 text-slate-500 uppercase tracking-wider font-bold">
                          Ledger Net Balance summary
                        </td>
                        <td className="px-5 py-4 text-right font-black text-base" colSpan={3}>
                          <span className={netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}>
                            {formatINR(netProfit)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
