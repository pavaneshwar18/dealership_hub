"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
};

type CashSheetData = {
  id: string;
  date: string;
  branchId: string;
  openingBalance: number;
  closingBalance: number;
  status: string;
  submittedAt: string | null;
  transactions: Transaction[];
  branch: { name: string };
  submittedBy: { name: string };
};

type BranchItem = {
  id: string;
  name: string;
};

type AdminCashSheetsClientProps = {
  branches: BranchItem[];
};

export function AdminCashSheetsClient({ branches }: AdminCashSheetsClientProps) {
  const [mounted, setMounted] = useState(false);
  const [sheets, setSheets] = useState<CashSheetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // Filter states
  const [selectedBranchId, setSelectedBranchId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("SUBMITTED"); // SUBMITTED by default
  const [fromDate, setFromDate] = useState(dateParams.monthStart);
  const [toDate, setToDate] = useState(dateParams.today);

  // Expanded row ID state
  const [expandedSheetId, setExpandedSheetId] = useState<string | null>(null);

  // Fetch cash sheets based on current filters
  const fetchSheets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        branchId: selectedBranchId,
        status: statusFilter,
        from: fromDate,
        to: toDate,
      });

      const res = await fetch(`/api/admin/cashsheets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSheets(data);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load cash sheets");
      }
    } catch {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, statusFilter, fromDate, toDate]);

  // Add transaction form
  const [txType, setTxType] = useState<"CREDIT" | "DEBIT">("DEBIT");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");

  // Opening balance edit
  const [editingOpeningBalance, setEditingOpeningBalance] = useState(false);
  const [obInput, setObInput] = useState("");

  // Delete sheet confirmation states
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Clear inputs when expanded sheet changes
  useEffect(() => {
    setEditingOpeningBalance(false);
    setObInput("");
    setTxAmount("");
    setTxDescription("");
    setTxType("DEBIT");
    setTxError("");
  }, [expandedSheetId]);

  // Handle Admin updating Opening Balance
  async function handleUpdateOpeningBalance(sheetId: string) {
    const val = parseFloat(obInput);
    if (isNaN(val) || val < 0) return;

    try {
      const res = await fetch(`/api/admin/cashsheets/${sheetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingBalance: val }),
      });

      if (res.ok) {
        fetchSheets();
      }
    } catch {
      // silent fail
    } finally {
      setEditingOpeningBalance(false);
    }
  }

  // Handle Admin adding transaction
  async function handleAddTransaction(e: React.FormEvent, sheetId: string) {
    e.preventDefault();
    setTxLoading(true);
    setTxError("");

    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) {
      setTxError("Enter a valid positive amount");
      setTxLoading(false);
      return;
    }

    if (!txDescription.trim()) {
      setTxError("Description is required");
      setTxLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/cashsheets/${sheetId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: txType,
          amount,
          description: txDescription.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTxError(data.error || "Failed to add transaction");
      } else {
        setTxAmount("");
        setTxDescription("");
        fetchSheets();
      }
    } catch {
      setTxError("Connection error");
    } finally {
      setTxLoading(false);
    }
  }

  // Handle Admin deleting transaction
  async function handleDeleteTransaction(sheetId: string, transactionId: string) {
    try {
      const res = await fetch(
        `/api/admin/cashsheets/${sheetId}/transactions?transactionId=${transactionId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        fetchSheets();
      }
    } catch {
      // silent fail
    }
  }

  // Handle Admin deleting cash sheet
  async function handleDeleteSheet(sheetId: string) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/cashsheets/${sheetId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setConfirmDeleteId(null);
        setExpandedSheetId(null);
        fetchSheets();
      }
    } catch {
      // silent fail
    } finally {
      setDeleteLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchSheets();
    }
  }, [mounted, fetchSheets]);

  // Format amount to INR currency format
  const formatINR = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date display
  const formatDateDisplay = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  // Format timestamp display
  const formatTimestamp = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  // Calculate stats for a single sheet
  const getSheetStats = (sheet: CashSheetData) => {
    let credits = 0;
    let debits = 0;
    sheet.transactions.forEach((tx) => {
      if (tx.type === "CREDIT") credits += tx.amount;
      else if (tx.type === "DEBIT") debits += tx.amount;
    });
    return { credits, debits };
  };

  // Export single cash sheet transactions and summary to CSV
  const handleExportSingleSheetCSV = (sheet: CashSheetData) => {
    const stats = getSheetStats(sheet);
    const sortedTx = [...sheet.transactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const headers = ["S.No.", "Description", "Debit (Received)", "Credit (Spent)"];
    const rows = sortedTx.map((tx, idx) => [
      idx + 1,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.type === "DEBIT" ? tx.amount : 0,
      tx.type === "CREDIT" ? tx.amount : 0
    ]);

    const csvLines = [
      `"Daily Cash Sheet Ledger"`,
      `"Branch","${sheet.branch.name.replace(/"/g, '""')}"`,
      `"Date","${formatDateDisplay(sheet.date)}"`,
      `"Submitted By","${sheet.submittedBy.name.replace(/"/g, '""')}"`,
      `"Submitted At","${sheet.submittedAt ? formatTimestamp(sheet.submittedAt) : "N/A"}"`,
      `"Opening Balance",${sheet.openingBalance}`,
      ``, // blank line
      headers.join(","),
      ...rows.map((r) => r.join(",")),
      ``, // blank line
      `"Total Debits",,${stats.debits}`,
      `"Total Credits",,,${stats.credits}`,
      `"Closing Balance",,,${sheet.openingBalance + stats.debits - stats.credits}`
    ];

    const csvContent = csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedBranchName = sheet.branch.name.replace(/[^a-z0-9]/gi, "_");
    const sanitizedDate = new Date(sheet.date).toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `cash_sheet_${sanitizedBranchName}_${sanitizedDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="text-slate-500 font-medium animate-pulse">Loading cash sheets...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Branch Cash Sheets</h1>
          <p className="mt-1.5 text-slate-500">
            Review and track daily cashier financial records and statements submitted by branches.
          </p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Filter Controls</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {/* Branch Filter */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Branch
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-55 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-55 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
            >
              <option value="SUBMITTED">Submitted (Final)</option>
              <option value="DRAFT">Draft (In Progress)</option>
              <option value="ALL">All Sheets</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
            />
          </div>
        </div>
      </div>

      {/* Main content list */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-slate-500 font-medium animate-pulse">Loading filtered records...</div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-rose-700 font-semibold">{error}</p>
        </div>
      ) : sheets.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-slate-400 shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-4 text-sm font-semibold text-slate-500">No Cash Sheets Found</p>
          <p className="mt-1 text-xs">Try adjusting your filters or date range</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
          {sheets.map((sheet) => {
            const isExpanded = expandedSheetId === sheet.id;
            const stats = getSheetStats(sheet);
            return (
              <div key={sheet.id} className="transition">
                {/* Collapsed view summary bar */}
                <div
                  onClick={() => setExpandedSheetId(isExpanded ? null : sheet.id)}
                  className="flex flex-col md:flex-row md:items-center md:justify-between px-6 py-4 hover:bg-slate-50/70 transition cursor-pointer select-none gap-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-slate-900 shrink-0">
                      {formatDateDisplay(sheet.date)}
                    </span>
                    <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-100 shrink-0">
                      {sheet.branch.name}
                    </span>
                    {sheet.status === "DRAFT" && (
                      <span className="inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-100 shrink-0 uppercase tracking-wider">
                        Draft
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8 flex-1 justify-end max-w-2xl text-right">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Opening
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatINR(sheet.openingBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider">
                        Total Debits
                      </p>
                      <p className="text-sm font-bold text-green-600">
                        + {formatINR(stats.debits)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                        Total Credits
                      </p>
                      <p className="text-sm font-bold text-rose-600">
                        - {formatINR(stats.credits)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                        Closing
                      </p>
                      <p className="text-sm font-black text-blue-700">
                        {formatINR(sheet.closingBalance)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportSingleSheetCSV(sheet);
                      }}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900 transition hover:bg-slate-50 shadow-sm"
                      title="Export Cash Sheet as CSV"
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
                    </button>
                    <span className="text-slate-300">
                      <svg
                        className={`h-5 w-5 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Expanded Detailed Cash Sheet Printout */}
                {isExpanded && (
                  <div className="px-6 py-6 bg-slate-50/50 border-t border-slate-100">
                    <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      {/* Outer Card header */}
                      <div className="bg-slate-900 px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            Daily Cash Sheet Ledger
                          </p>
                          <h3 className="text-xl font-bold mt-0.5">{sheet.branch.name} Branch</h3>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left sm:text-right">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Statement Date
                            </p>
                            <p className="text-sm font-extrabold">{formatDateDisplay(sheet.date)}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(sheet.id);
                            }}
                            className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition shrink-0"
                          >
                            Delete Sheet
                          </button>
                        </div>
                      </div>

                      {/* Info Panel */}
                      <div className="grid gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 sm:grid-cols-2 text-xs text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-400">Submitted By: </span>
                          <span className="font-bold text-slate-800">{sheet.submittedBy.name}</span>
                        </div>
                        <div className="sm:text-right">
                          <span className="font-semibold text-slate-400">Submitted At: </span>
                          <span className="font-bold text-slate-800">
                            {sheet.submittedAt ? formatTimestamp(sheet.submittedAt) : "Not yet submitted"}
                          </span>
                        </div>
                      </div>

                      {/* Opening Balance */}
                      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-blue-50/30">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Opening Balance
                        </span>
                        {editingOpeningBalance ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="any"
                              value={obInput}
                              onChange={(e) => setObInput(e.target.value)}
                              className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
                            />
                            <button
                              onClick={() => handleUpdateOpeningBalance(sheet.id)}
                              className="rounded-lg bg-green-600 hover:bg-green-700 px-3 py-1 text-xs font-bold text-white shadow-sm transition"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingOpeningBalance(false);
                                setObInput("");
                              }}
                              className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-base font-extrabold text-blue-700">
                              {formatINR(sheet.openingBalance)}
                            </span>
                            <button
                              onClick={() => {
                                setObInput(sheet.openingBalance.toString());
                                setEditingOpeningBalance(true);
                              }}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 underline transition"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Transaction Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                            <tr>
                              <th className="px-6 py-3 text-left font-bold w-12">S.No.</th>
                              <th className="px-6 py-3 text-left font-bold">Description</th>
                              <th className="px-6 py-3 text-right font-bold w-40">Debit (Received)</th>
                              <th className="px-6 py-3 text-right font-bold w-40">Credit (Spent)</th>
                              <th className="px-6 py-3 text-center font-bold w-16">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sheet.transactions.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-6 py-6 text-center text-slate-400 font-medium">
                                  No transaction entries recorded for this sheet.
                                </td>
                              </tr>
                            ) : (
                              [...sheet.transactions]
                                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                .map((tx, idx) => (
                                  <tr key={tx.id} className="hover:bg-slate-50/35 transition">
                                    <td className="px-6 py-3.5 text-slate-500 font-medium">{idx + 1}</td>
                                    <td className="px-6 py-3.5 text-slate-900 font-bold">{tx.description}</td>
                                    <td className="px-6 py-3.5 text-right font-bold text-green-600">
                                      {tx.type === "DEBIT" ? formatINR(tx.amount) : ""}
                                    </td>
                                    <td className="px-6 py-3.5 text-right font-bold text-rose-600">
                                      {tx.type === "CREDIT" ? formatINR(tx.amount) : ""}
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                      <button
                                        onClick={() => handleDeleteTransaction(sheet.id, tx.id)}
                                        className="text-rose-500 hover:text-rose-700 transition p-1"
                                        title="Delete entry"
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
                          <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                              <td colSpan={2} className="px-6 py-3 font-extrabold text-slate-700">
                                Totals
                              </td>
                              <td className="px-6 py-3 text-right font-extrabold text-green-700">
                                {formatINR(stats.debits)}
                              </td>
                              <td className="px-6 py-3 text-right font-extrabold text-rose-700">
                                {formatINR(stats.credits)}
                              </td>
                              <td className="px-6 py-3"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Add Transaction Form */}
                      <form
                        onSubmit={(e) => handleAddTransaction(e, sheet.id)}
                        className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col md:flex-row md:items-end gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <label className="mb-1 block font-bold text-slate-500 uppercase tracking-wider">
                            Description
                          </label>
                          <input
                            type="text"
                            value={txDescription}
                            onChange={(e) => setTxDescription(e.target.value)}
                            placeholder="e.g. Received from customer / Office expenses"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
                          />
                        </div>
                        <div className="w-full md:w-36 font-semibold">
                          <label className="mb-1 block font-bold text-slate-500 uppercase tracking-wider">
                            Type
                          </label>
                          <select
                            value={txType}
                            onChange={(e) => setTxType(e.target.value as "CREDIT" | "DEBIT")}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
                          >
                            <option value="DEBIT">Debit (Received)</option>
                            <option value="CREDIT">Credit (Spent)</option>
                          </select>
                        </div>
                        <div className="w-full md:w-32">
                          <label className="mb-1 block font-bold text-slate-500 uppercase tracking-wider">
                            Amount (₹)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={txAmount}
                            onChange={(e) => setTxAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-blue-500/20 focus:ring-4 transition"
                          />
                        </div>
                        <div className="shrink-0 w-full md:w-auto">
                          <button
                            type="submit"
                            disabled={txLoading}
                            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 text-xs transition disabled:opacity-50 h-[34px] flex items-center justify-center"
                          >
                            {txLoading ? "Adding..." : "+ Add Entry"}
                          </button>
                        </div>
                      </form>
                      {txError && (
                        <div className="bg-rose-50 px-6 py-2 text-xs font-semibold text-rose-600 border-t border-rose-100">
                          {txError}
                        </div>
                      )}

                      {/* Closing Balance summary banner */}
                      <div className="flex items-center justify-between px-6 py-4.5 border-t-2 border-slate-900 bg-slate-900 text-white">
                        <span className="text-xs font-black uppercase tracking-wider">
                          Closing Balance
                        </span>
                        <span className="text-xl font-black">
                          {formatINR(sheet.openingBalance + stats.debits - stats.credits)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900">Delete Cash Sheet?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to permanently delete this cash sheet and all its transaction entries? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSheet(confirmDeleteId)}
                disabled={deleteLoading}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition flex items-center gap-2"
              >
                {deleteLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
