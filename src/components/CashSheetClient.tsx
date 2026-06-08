"use client";

import { useState, useEffect, useMemo } from "react";
import type { SessionUser } from "@/lib/auth";

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

type CashSheetClientProps = {
  user: SessionUser;
};

export function CashSheetClient({ user }: CashSheetClientProps) {
  const [mounted, setMounted] = useState(false);
  const [sheet, setSheet] = useState<CashSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add transaction form
  const [txType, setTxType] = useState<"CREDIT" | "DEBIT">("DEBIT");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");

  // Preview mode
  const [previewMode, setPreviewMode] = useState(false);

  // Opening balance edit
  const [editingOpeningBalance, setEditingOpeningBalance] = useState(false);
  const [obInput, setObInput] = useState("");

  // Submit loading
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchSheet();
  }, []);

  async function fetchSheet() {
    setLoading(true);
    try {
      const res = await fetch("/api/cashsheet");
      if (res.ok) {
        const data = await res.json();
        setSheet(data);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load cash sheet");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    if (!sheet) return { credits: 0, debits: 0, balance: 0 };
    let credits = 0; // Cash Out
    let debits = 0;  // Cash In
    sheet.transactions.forEach((t) => {
      if (t.type === "DEBIT") debits += t.amount;
      else credits += t.amount;
    });
    return {
      credits,
      debits,
      balance: sheet.openingBalance + debits - credits,
    };
  }, [sheet]);

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!sheet) return;
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
      const res = await fetch(`/api/cashsheet/${sheet.id}/transactions`, {
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
        setTxLoading(false);
        return;
      }

      // Add to local state
      setSheet((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          transactions: [data, ...prev.transactions],
        };
      });

      // Reset form
      setTxAmount("");
      setTxDescription("");
    } catch {
      setTxError("Connection error");
    } finally {
      setTxLoading(false);
    }
  }

  async function handleDeleteTransaction(transactionId: string) {
    if (!sheet) return;

    try {
      const res = await fetch(
        `/api/cashsheet/${sheet.id}/transactions?transactionId=${transactionId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setSheet((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            transactions: prev.transactions.filter((t) => t.id !== transactionId),
          };
        });
      }
    } catch {
      // silent fail
    }
  }

  async function handleUpdateOpeningBalance() {
    if (!sheet) return;
    const val = parseFloat(obInput);
    if (isNaN(val) || val < 0) return;

    try {
      const res = await fetch("/api/cashsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingBalance: val }),
      });

      if (res.ok) {
        const data = await res.json();
        setSheet(data);
      }
    } catch {
      // silent fail
    } finally {
      setEditingOpeningBalance(false);
    }
  }

  async function handleSubmit() {
    if (!sheet) return;
    setSubmitLoading(true);

    try {
      const res = await fetch(`/api/cashsheet/${sheet.id}`, {
        method: "PUT",
      });

      if (res.ok) {
        const data = await res.json();
        setSheet(data);
        setPreviewMode(false);
      }
    } catch {
      // silent fail
    } finally {
      setSubmitLoading(false);
    }
  }

  function formatINR(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  }

  if (!mounted || loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="text-slate-500 font-medium animate-pulse">
          Loading cash sheet...
        </div>
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
        <p className="text-rose-700 font-medium">{error || "Unable to load cash sheet"}</p>
      </div>
    );
  }

  const isSubmitted = sheet.status === "SUBMITTED";
  const todayDisplay = new Date(sheet.date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // ─── SUBMITTED VIEW ───
  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Daily Cash Sheet</h1>
            <p className="mt-2 text-slate-500">{todayDisplay}</p>
          </div>
          <span className="inline-flex self-start items-center rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-sm font-bold text-green-700">
            ✓ Submitted
          </span>
        </div>

        {renderCashSheetView()}
      </div>
    );
  }

  // ─── PREVIEW MODE ───
  if (previewMode) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Cash Sheet Preview</h1>
            <p className="mt-2 text-slate-500">
              Review before submitting · {todayDisplay}
            </p>
          </div>
          <div className="flex gap-3 self-start">
            <button
              onClick={() => setPreviewMode(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              ← Back to Edit
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitLoading}
              className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition disabled:opacity-50 shadow-sm"
            >
              {submitLoading ? "Submitting..." : "Submit Cash Sheet"}
            </button>
          </div>
        </div>

        {renderCashSheetView()}
      </div>
    );
  }

  // ─── DRAFT MODE (main editing view) ───
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Daily Cash Sheet</h1>
          <p className="mt-2 text-slate-500">
            {user.branchName} Branch · {todayDisplay}
          </p>
        </div>
        <span className="inline-flex self-start items-center rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
          Draft — In Progress
        </span>
      </div>

      {/* Opening Balance Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Opening Balance
            </p>
            {editingOpeningBalance ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={obInput}
                  onChange={(e) => setObInput(e.target.value)}
                  className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  autoFocus
                />
                <button
                  onClick={handleUpdateOpeningBalance}
                  className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingOpeningBalance(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatINR(sheet.openingBalance)}
              </p>
            )}
          </div>
          {!editingOpeningBalance && (
            <button
              onClick={() => {
                setObInput(String(sheet.openingBalance));
                setEditingOpeningBalance(true);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Running Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-600">
            Total Debits (Received)
          </p>
          <p className="mt-1 text-xl font-bold text-green-700">
            {formatINR(totals.debits)}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
            Total Credits (Spent)
          </p>
          <p className="mt-1 text-xl font-bold text-rose-700">
            {formatINR(totals.credits)}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Current Balance
          </p>
          <p className="mt-1 text-xl font-bold text-blue-700">
            {formatINR(totals.balance)}
          </p>
        </div>
      </div>

      {/* Add Transaction Form */}
      <form
        onSubmit={handleAddTransaction}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
      >
        <h2 className="text-lg font-bold text-slate-900">Add Transaction</h2>

        {txError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800">
            {txError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Type *
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTxType("DEBIT")}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition border ${
                  txType === "DEBIT"
                    ? "bg-green-50 border-green-300 text-green-700 ring-2 ring-green-500/30"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ↑ Debit (In)
              </button>
              <button
                type="button"
                onClick={() => setTxType("CREDIT")}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition border ${
                  txType === "CREDIT"
                    ? "bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/30"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ↓ Credit (Out)
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Amount (₹) *
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Description *
            </label>
            <input
              type="text"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              placeholder="e.g. Customer down payment, Fuel expense..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={txLoading}
            className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50 shadow-sm"
          >
            {txLoading ? "Adding..." : "+ Add Entry"}
          </button>
        </div>
      </form>

      {/* Transactions List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            Today&apos;s Transactions
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({sheet.transactions.length} entries)
            </span>
          </h2>
        </div>
        {sheet.transactions.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400">
            <p className="text-sm font-medium">No transactions recorded yet</p>
            <p className="mt-1 text-xs">Add debits and credits using the form above</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sheet.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      tx.type === "DEBIT"
                        ? "bg-green-50 text-green-600 border border-green-100"
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}
                  >
                    {tx.type === "DEBIT" ? "↑" : "↓"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-slate-400">{formatTime(tx.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-sm font-bold ${
                      tx.type === "DEBIT" ? "text-green-600" : "text-rose-600"
                    }`}
                  >
                    {tx.type === "DEBIT" ? "+" : "−"} {formatINR(tx.amount)}
                  </span>
                  <button
                    onClick={() => handleDeleteTransaction(tx.id)}
                    className="text-slate-300 hover:text-rose-500 transition"
                    title="Remove"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Cash Sheet Button */}
      {sheet.transactions.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setPreviewMode(true)}
            className="rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white hover:bg-slate-800 transition shadow-lg shadow-slate-900/10"
          >
            Generate Cash Sheet →
          </button>
        </div>
      )}
    </div>
  );

  // ─── Shared formatted cash sheet view (used in preview + submitted) ───
  function renderCashSheetView() {
    if (!sheet) return null;

    const sortedTx = [...sheet.transactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Sheet Header */}
        <div className="bg-slate-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Daily Cash Sheet
              </p>
              <p className="mt-1 text-lg font-bold">{sheet.branch.name} Branch</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-300">Date</p>
              <p className="text-sm font-bold">{todayDisplay}</p>
              <p className="mt-1 text-xs text-slate-400">
                By {sheet.submittedBy.name}
              </p>
            </div>
          </div>
        </div>

        {/* Opening Balance */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-blue-50/50">
          <span className="text-sm font-semibold text-slate-700">Opening Balance</span>
          <span className="text-lg font-bold text-blue-700">
            {formatINR(sheet.openingBalance)}
          </span>
        </div>

        {/* Transaction Table */}
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-3 text-left font-semibold w-12">S.No.</th>
              <th className="px-6 py-3 text-left font-semibold">Description</th>
              <th className="px-6 py-3 text-right font-semibold">Debit (Received)</th>
              <th className="px-6 py-3 text-right font-semibold">Credit (Spent)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTx.map((tx, index) => (
              <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-3 text-slate-500">{index + 1}</td>
                <td className="px-6 py-3 text-slate-900 font-medium">
                  {tx.description}
                </td>
                <td className="px-6 py-3 text-right font-semibold text-green-600">
                  {tx.type === "DEBIT" ? formatINR(tx.amount) : ""}
                </td>
                <td className="px-6 py-3 text-right font-semibold text-rose-600">
                  {tx.type === "CREDIT" ? formatINR(tx.amount) : ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-200">
            <tr>
              <td colSpan={2} className="px-6 py-3 font-bold text-slate-700">
                Totals
              </td>
              <td className="px-6 py-3 text-right font-bold text-green-700">
                {formatINR(totals.debits)}
              </td>
              <td className="px-6 py-3 text-right font-bold text-rose-700">
                {formatINR(totals.credits)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Closing Balance */}
        <div className="flex items-center justify-between px-6 py-5 border-t-2 border-slate-900 bg-slate-900 text-white">
          <span className="text-sm font-bold uppercase tracking-wider">
            Closing Balance
          </span>
          <span className="text-2xl font-bold">
            {formatINR(totals.balance)}
          </span>
        </div>
      </div>
    );
  }
}
