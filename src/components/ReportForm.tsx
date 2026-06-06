"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VEHICLE_MODELS } from "@/lib/models";
import type { DailyReportInput, StockEntryInput } from "@/lib/reports";

type ReportFormProps = {
  initialDate: string;
  initialValues?: Partial<DailyReportInput>;
  reportId?: string;
};

const defaultValues: Omit<DailyReportInput, "stockEntries"> = {
  date: "",
  vehiclesSold: 0,
  salesValue: 0,
  bookings: 0,
  pendingDeliveries: 0,
  testDrives: 0,
  serviceJobs: 0,
  serviceRevenue: 0,
  cashCollected: 0,
  pendingPayments: 0,
  staffPresent: 0,
  customerComplaints: 0,
  highlights: "",
  issues: "",
  notes: "",
};

type StockRow = {
  modelName: string;
  modelVariant: string | null;
  stockOnHand: number;
  newStockReceived: number;
};

function buildInitialStockRows(existing?: StockEntryInput[]): StockRow[] {
  const rows: StockRow[] = [];
  for (const model of VEHICLE_MODELS) {
    if (model.variants && model.variants.length > 0) {
      for (const variant of model.variants) {
        const match = existing?.find(
          (e) => e.modelName === model.name && e.modelVariant === variant,
        );
        rows.push({
          modelName: model.name,
          modelVariant: variant,
          stockOnHand: match?.stockOnHand ?? 0,
          newStockReceived: match?.newStockReceived ?? 0,
        });
      }
    } else {
      const match = existing?.find(
        (e) => e.modelName === model.name && !e.modelVariant,
      );
      rows.push({
        modelName: model.name,
        modelVariant: null,
        stockOnHand: match?.stockOnHand ?? 0,
        newStockReceived: match?.newStockReceived ?? 0,
      });
    }
  }
  return rows;
}

function Field({
  label,
  name,
  type = "number",
  value,
  onChange,
  min = 0,
  step,
  placeholder,
  disabled,
}: {
  label: string;
  name: string;
  type?: "number" | "text" | "date";
  value: string | number;
  onChange: (name: string, value: string) => void;
  min?: number;
  step?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        min={type === "number" ? min : undefined}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(name, event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  value?: string;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <textarea
        name={name}
        rows={3}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
      />
    </label>
  );
}

export function ReportForm({
  initialDate,
  initialValues,
  reportId,
}: ReportFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Omit<DailyReportInput, "stockEntries">>({
    ...defaultValues,
    ...initialValues,
    date: initialDate,
  });
  const [stockRows, setStockRows] = useState<StockRow[]>(
    buildInitialStockRows(initialValues?.stockEntries),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateStock(index: number, field: "stockOnHand" | "newStockReceived", value: string) {
    setStockRows((current) => {
      const updated = [...current];
      updated[index] = { ...updated[index], [field]: Number(value) || 0 };
      return updated;
    });
  }

  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceLogged, setAttendanceLogged] = useState(false);

  useEffect(() => {
    if (!values.date) return;
    let active = true;

    async function checkAttendance() {
      setAttendanceLoading(true);
      try {
        const res = await fetch(`/api/dashboard/attendance?date=${values.date}`);
        const data = await res.json();
        if (res.ok && active) {
          const logged = data.some((item: any) => item.status !== null);
          setAttendanceLogged(logged);
          if (logged) {
            const presentCount = data.filter((item: any) => item.status === "PRESENT").length;
            setValues((curr) => ({ ...curr, staffPresent: presentCount }));
          } else {
            setValues((curr) => ({ ...curr, staffPresent: 0 }));
          }
        }
      } catch (err) {
        console.error("Error checking attendance for report:", err);
      } finally {
        if (active) setAttendanceLoading(false);
      }
    }

    checkAttendance();
    return () => {
      active = false;
    };
  }, [values.date]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const stockEntries = stockRows.filter(
      (r) => r.stockOnHand > 0 || r.newStockReceived > 0,
    );

    const payload = { ...values, stockEntries };

    const response = await fetch(reportId ? `/api/reports/${reportId}` : "/api/reports", {
      method: reportId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to save report");
      return;
    }

    router.push("/dashboard?saved=1");
    router.refresh();
  }

  // Group stock rows by base model for visual grouping
  let currentModel = "";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Daily Report</h2>
            <p className="text-sm text-slate-500">
              Submit today&apos;s numbers for your branch. All amounts in INR.
            </p>
          </div>
          <Field
            label="Report date"
            name="date"
            type="date"
            value={values.date}
            onChange={updateField}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Vehicles sold" name="vehiclesSold" value={values.vehiclesSold} onChange={updateField} />
          <Field label="Sales value (INR)" name="salesValue" value={values.salesValue} onChange={updateField} step="0.01" />
          <Field label="Bookings" name="bookings" value={values.bookings} onChange={updateField} />
          <Field label="Pending deliveries" name="pendingDeliveries" value={values.pendingDeliveries} onChange={updateField} />
          <Field label="Test drives" name="testDrives" value={values.testDrives} onChange={updateField} />
          <Field label="Service jobs completed" name="serviceJobs" value={values.serviceJobs} onChange={updateField} />
          <Field label="Service revenue (INR)" name="serviceRevenue" value={values.serviceRevenue} onChange={updateField} step="0.01" />
          <Field label="Cash collected (INR)" name="cashCollected" value={values.cashCollected} onChange={updateField} step="0.01" />
          <Field label="Pending payments (INR)" name="pendingPayments" value={values.pendingPayments} onChange={updateField} step="0.01" />
          <div className="relative">
            <Field
              label="Staff present"
              name="staffPresent"
              value={values.staffPresent}
              onChange={updateField}
              disabled={true}
            />
            {attendanceLoading ? (
              <span className="mt-1 block text-xs text-slate-500 animate-pulse">
                Checking attendance...
              </span>
            ) : attendanceLogged ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Logged via Attendance tab
              </span>
            ) : (
              <div className="mt-1 text-xs text-amber-700 font-semibold space-y-1">
                <span>⚠️ Please log attendance for this date first.</span>
                <Link
                  href="/dashboard/attendance"
                  className="block text-blue-700 hover:underline"
                >
                  Log attendance &rarr;
                </Link>
              </div>
            )}
          </div>
          <Field label="Customer complaints" name="customerComplaints" value={values.customerComplaints} onChange={updateField} />
        </div>
      </section>

      {/* Stock by Model */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Stock by Model</h2>
        <p className="mb-5 text-sm text-slate-500">
          Enter current stock on hand and new stock received for each model.
        </p>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium text-center w-36">On Hand</th>
                <th className="px-4 py-3 font-medium text-center w-36">New Received</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.map((row, index) => {
                const isNewGroup = row.modelName !== currentModel;
                currentModel = row.modelName;

                return (
                  <tr
                    key={`${row.modelName}-${row.modelVariant ?? "base"}`}
                    className={`border-t border-slate-100 ${isNewGroup && row.modelVariant ? "border-t-slate-200" : ""}`}
                  >
                    <td className="px-4 py-2.5">
                      {row.modelVariant ? (
                        <span className="text-slate-600">
                          {isNewGroup && (
                            <span className="font-medium text-slate-900">{row.modelName} — </span>
                          )}
                          {!isNewGroup && (
                            <span className="ml-6 text-slate-400">└ </span>
                          )}
                          <span>{row.modelVariant}</span>
                        </span>
                      ) : (
                        <span className="font-medium text-slate-900">{row.modelName}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        value={row.stockOnHand}
                        onChange={(e) => updateStock(index, "stockOnHand", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm outline-none ring-blue-500 focus:ring-2"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        value={row.newStockReceived}
                        onChange={(e) => updateStock(index, "newStockReceived", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm outline-none ring-blue-500 focus:ring-2"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Notes for admin</h2>
        <div className="grid gap-4">
          <TextArea
            label="Highlights / wins"
            name="highlights"
            value={values.highlights}
            onChange={updateField}
            placeholder="Strong sales day, new corporate order, etc."
          />
          <TextArea
            label="Issues needing attention"
            name="issues"
            value={values.issues}
            onChange={updateField}
            placeholder="Delayed delivery, stock shortage, payment follow-up..."
          />
          <TextArea
            label="Additional notes"
            name="notes"
            value={values.notes}
            onChange={updateField}
            placeholder="Anything else the admin should know."
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !attendanceLogged || attendanceLoading}
          className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? "Saving..." : reportId ? "Update report" : "Submit report"}
        </button>
      </div>
    </form>
  );
}
