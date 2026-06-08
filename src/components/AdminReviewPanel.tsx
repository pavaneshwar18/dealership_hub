"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatINR } from "@/lib/format";

type ReportDetail = {
  id: string;
  date: string;
  branch: { name: string };
  submittedBy: { name: string };
  vehiclesSold: number;
  salesValue: number;
  bookings: number;
  pendingDeliveries: number;
  testDrives: number;
  serviceJobs: number;
  serviceRevenue: number;
  cashCollected: number;
  pendingPayments: number;
  staffPresent: number;
  customerComplaints: number;
  highlights: string | null;
  issues: string | null;
  notes: string | null;
  status: "SUBMITTED" | "REVIEWED";
  adminComment: string | null;
};

type AdminReviewPanelProps = {
  report: ReportDetail;
};

export function AdminReviewPanel({ report }: AdminReviewPanelProps) {
  const router = useRouter();
  const [comment, setComment] = useState(report.adminComment ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleReview(markReviewed: boolean) {
    setLoading(true);
    setMessage("");

    const response = await fetch(`/api/reports/${report.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminComment: comment,
        markReviewed,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      setMessage("Unable to save review");
      return;
    }

    setMessage(markReviewed ? "Report marked as reviewed" : "Comment saved");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Admin review</h2>
      <p className="mt-1 text-sm text-slate-500">
        {report.branch.name} · {formatDate(report.date)} · {report.submittedBy.name}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Vehicles sold" value={String(report.vehiclesSold)} />
        <Metric label="Sales value" value={formatINR(report.salesValue)} />
        <Metric label="Service revenue" value={formatINR(report.serviceRevenue)} />
        <Metric label="Cash collected" value={formatINR(report.cashCollected)} />
      </div>


      {(report.highlights || report.issues || report.notes) && (
        <div className="mt-5 grid gap-3">
          {report.highlights ? <Note label="Highlights" text={report.highlights} /> : null}
          {report.issues ? <Note label="Issues" text={report.issues} tone="warning" /> : null}
          {report.notes ? <Note label="Notes" text={report.notes} /> : null}
        </div>
      )}

      <div className="mt-5">
        <label className="block text-sm font-medium text-slate-700">Your comment</label>
        <textarea
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
          placeholder="Follow-up instructions or acknowledgement"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleReview(false)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Save comment
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleReview(true)}
          className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          Mark reviewed
        </button>
        <span className="self-center text-sm text-slate-500">
          Status: {report.status === "REVIEWED" ? "Reviewed" : "Pending review"}
        </span>
      </div>

      {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Note({
  label,
  text,
  tone = "default",
}: {
  label: string;
  text: string;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${
        tone === "warning"
          ? "border border-amber-200 bg-amber-50 text-amber-900"
          : "border border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      <p className="font-medium">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{text}</p>
    </div>
  );
}
