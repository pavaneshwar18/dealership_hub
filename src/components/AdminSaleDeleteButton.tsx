"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSaleDeleteButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStep(0);
        router.push("/admin/sales");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete sale report");
        setDeleting(false);
      }
    } catch (err) {
      setError("An error occurred while deleting the sale report.");
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setError(null);
          setStep(1);
        }}
        className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition"
      >
        Delete
      </button>

      {step > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => {
              if (!deleting) setStep(0);
            }}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-200">
            <div className="flex flex-col items-center text-center">
              {/* Alert Icon */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              {step === 1 && (
                <>
                  <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Are you sure you want to delete this sale report?
                  </p>
                </>
              )}

              {step === 2 && (
                <>
                  <h3 className="text-lg font-bold text-rose-600">Double Confirmation Required</h3>
                  <p className="mt-2 text-sm text-slate-600 font-medium">
                    Are you absolutely sure? This will permanently remove the sale record from database.
                  </p>
                </>
              )}

              {error && (
                <div className="mt-3 w-full rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-600">
                  {error}
                </div>
              )}

              <div className="mt-6 flex w-full items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setStep(0)}
                  className="w-1/2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>

                {step === 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-1/2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
                  >
                    Continue
                  </button>
                )}

                {step === 2 && (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="w-1/2 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                  >
                    {deleting ? "Deleting..." : "Permanently Delete"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
