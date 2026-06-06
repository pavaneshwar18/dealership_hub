"use client";

import { useEffect, useState } from "react";

type StaffAttendanceItem = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  status: "PRESENT" | "ABSENT" | "LEAVE" | null;
  notes: string;
};

type ManagerAttendanceClientProps = {
  defaultDate: string;
};

export function ManagerAttendanceClient({ defaultDate }: ManagerAttendanceClientProps) {
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [staffList, setStaffList] = useState<StaffAttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");
      try {
        const res = await fetch(`/api/dashboard/attendance?date=${selectedDate}`);
        const data = await res.json();
        
        if (!res.ok) {
          setErrorMsg(data.error ?? "Failed to load staff list.");
          return;
        }

        if (active) {
          // Default unlogged staff to PRESENT
          const list = data.map((item: StaffAttendanceItem) => ({
            ...item,
            status: item.status || "PRESENT",
          }));
          setStaffList(list);
        }
      } catch {
        setErrorMsg("Failed to load staff list due to a network error.");
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();

    return () => {
      active = false;
    };
  }, [selectedDate]);

  function handleStatusChange(id: string, status: "PRESENT" | "ABSENT" | "LEAVE") {
    setStaffList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    setSuccessMsg("");
  }

  function handleNotesChange(id: string, notes: string) {
    setStaffList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    );
    setSuccessMsg("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    const payload = {
      date: selectedDate,
      attendance: staffList.map((item) => ({
        staffId: item.id,
        status: item.status,
        notes: item.status === "PRESENT" ? "" : item.notes,
      })),
    };

    try {
      const res = await fetch("/api/dashboard/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setSaving(false);

      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to save attendance.");
        return;
      }

      setSuccessMsg("Attendance saved successfully!");
    } catch {
      setSaving(false);
      setErrorMsg("Failed to save attendance due to a network error.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="inline-flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">Select Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
          />
        </label>
      </div>

      {/* Staff Checklist */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700 mb-2" />
              Loading staff list...
            </div>
          ) : staffList.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No staff members registered for this branch. Please contact Admin.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {staffList.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 hover:bg-slate-50/30 transition"
                >
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-900">{item.name}</h3>
                    <p className="text-xs font-medium text-slate-500">{item.role}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Status Buttons */}
                    <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "PRESENT")}
                        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                          item.status === "PRESENT"
                            ? "bg-green-700 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "ABSENT")}
                        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                          item.status === "ABSENT"
                            ? "bg-rose-700 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "LEAVE")}
                        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                          item.status === "LEAVE"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        Leave
                      </button>
                    </div>

                    {/* Notes Field (only show if absent or on leave) */}
                    {item.status !== "PRESENT" && (
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleNotesChange(item.id, e.target.value)}
                        placeholder={item.status === "LEAVE" ? "Reason for leave" : "Reason for absence"}
                        className="w-full sm:w-48 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 outline-none ring-blue-500 focus:ring-2"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMsg}
          </div>
        )}

        {/* Form Action */}
        {!loading && staffList.length > 0 && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
