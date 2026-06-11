"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminSaleApprovalControlsProps = {
  saleId: string;
  customerName: string;
  totalAmount: number;
  mrpAmount: number;
};

export function AdminSaleApprovalControls({
  saleId,
  customerName,
  totalAmount,
  mrpAmount,
}: AdminSaleApprovalControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [error, setError] = useState("");

  const discount = mrpAmount - totalAmount;

  async function handleUpdateStatus(status: "APPROVED" | "REJECTED") {
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("status", status);
      if (status === "REJECTED" && rejectComment.trim()) {
        formData.set("adminComment", rejectComment.trim());
      }

      const res = await fetch(`/api/sales/${saleId}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update status");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred while updating status");
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            Pending Sale Approval Request
          </h2>
          <p className="mt-1.5 text-sm text-amber-800">
            This sale for <strong className="font-semibold">{customerName}</strong> was flag-raised because the proposed sale price (<strong>₹{totalAmount.toLocaleString("en-IN")}</strong>) is below the vehicle's standard MRP (<strong>₹{mrpAmount.toLocaleString("en-IN")}</strong>).
          </p>
          <p className="mt-1 text-sm text-rose-700 font-semibold">
            Discount Given: ₹{discount.toLocaleString("en-IN")}
          </p>
        </div>

        {!showRejectForm && (
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleUpdateStatus("APPROVED")}
              disabled={loading}
              className="rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 shadow-sm transition"
            >
              {loading ? "Processing..." : "Approve Sale"}
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={loading}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 shadow-sm transition"
            >
              Reject Sale
            </button>
          </div>
        )}
      </div>

      {showRejectForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!rejectComment.trim()) {
              setError("Please provide a reason for rejection");
              return;
            }
            handleUpdateStatus("REJECTED");
          }}
          className="mt-5 border-t border-amber-200/50 pt-4 space-y-4"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-amber-900">
              Reason for Rejection *
            </span>
            <textarea
              rows={2}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="e.g., Discount exceeds maximum allowed threshold. Please adjust downpayment or financing."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white"
              required
            />
          </label>

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowRejectForm(false);
                setRejectComment("");
                setError("");
              }}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
            >
              {loading ? "Processing..." : "Confirm Rejection"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      )}
    </div>
  );
}
