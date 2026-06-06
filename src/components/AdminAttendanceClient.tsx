"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";

type BranchItem = {
  id: string;
  name: string;
};

type DailyAttendanceRecord = {
  id: string;
  name: string;
  role: string;
  status: "PRESENT" | "ABSENT" | "LEAVE" | null;
  notes: string;
};

type MatrixStaffItem = {
  id: string;
  name: string;
  role: string;
  salary: number;
  active: boolean;
  records: Record<string, string>;
};

type MatrixData = {
  days: string[];
  staff: MatrixStaffItem[];
};

type AdminAttendanceClientProps = {
  branches: BranchItem[];
};

export function AdminAttendanceClient({ branches }: AdminAttendanceClientProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "matrix">("daily");
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || "");
  
  // Date states
  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Data states
  const [dailyRecords, setDailyRecords] = useState<DailyAttendanceRecord[]>([]);
  const [matrixData, setMatrixData] = useState<MatrixData>({ days: [], staff: [] });
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!selectedBranchId) return;

    let active = true;
    async function loadData() {
      setLoading(true);
      setErrorMsg("");
      try {
        if (activeTab === "daily") {
          const res = await fetch(
            `/api/admin/attendance?branchId=${selectedBranchId}&date=${selectedDate}`
          );
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error ?? "Failed to load daily attendance logs.");
            return;
          }
          if (active) setDailyRecords(data);
        } else {
          const res = await fetch(
            `/api/admin/attendance?mode=matrix&branchId=${selectedBranchId}&month=${selectedMonth}`
          );
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error ?? "Failed to load monthly attendance matrix.");
            return;
          }
          if (active) setMatrixData(data);
        }
      } catch {
        setErrorMsg("Failed to load records due to a network error.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [activeTab, selectedBranchId, selectedDate, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("daily")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "daily"
              ? "border-blue-700 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Daily Attendance Logs
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "matrix"
              ? "border-blue-700 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Monthly Matrix Grid
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dealership Branch</span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        {activeTab === "daily" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            />
          </label>
        )}
      </div>

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* Main View Area */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700 mb-2" />
          Fetching logs...
        </div>
      ) : activeTab === "daily" ? (
        /* Daily List Table */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Employee</th>
                <th className="px-5 py-3.5 font-semibold">Role</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Remarks / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    No logs found for this date.
                  </td>
                </tr>
              ) : (
                dailyRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4 font-semibold text-slate-900">{rec.name}</td>
                    <td className="px-5 py-4 text-slate-600">{rec.role}</td>
                    <td className="px-5 py-4">
                      {rec.status === "PRESENT" && (
                        <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          Present
                        </span>
                      )}
                      {rec.status === "ABSENT" && (
                        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                          Absent
                        </span>
                      )}
                      {rec.status === "LEAVE" && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          On Leave
                        </span>
                      )}
                      {rec.status === null && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                          Unmarked
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{rec.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Monthly Matrix Grid */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="sticky left-0 bg-slate-50 px-4 py-3 font-semibold shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[150px]">
                    Employee
                  </th>
                  <th className="px-3 py-3 font-semibold min-w-[110px]">
                    Role
                  </th>
                  {matrixData.days.map((day) => {
                    const dayNum = day.slice(8); // extracts "DD"
                    return (
                      <th key={day} className="px-2 py-3 font-semibold text-center min-w-[32px]">
                        {dayNum}
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 font-semibold text-center min-w-[65px] border-l border-slate-200 bg-slate-50/80">
                    Present
                  </th>
                  <th className="px-3 py-3 font-semibold text-center min-w-[75px] bg-slate-50/80">
                    Paid Days
                  </th>
                  <th className="px-3 py-3 font-semibold text-right min-w-[95px] bg-slate-50/80">
                    Salary Due
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData.staff.length === 0 ? (
                  <tr>
                    <td colSpan={5 + matrixData.days.length} className="px-4 py-8 text-center text-slate-500">
                      No staff records found for this branch.
                    </td>
                  </tr>
                ) : (
                  matrixData.staff.map((employee) => {
                    let presentCount = 0;
                    let leaveCount = 0;
                    let absentCount = 0;
                    matrixData.days.forEach((day) => {
                      const status = employee.records[day];
                      if (status === "PRESENT") presentCount++;
                      else if (status === "LEAVE") leaveCount++;
                      else if (status === "ABSENT") absentCount++;
                    });
                    const totalDays = matrixData.days.length;
                    const unmarkedCount = totalDays - (presentCount + leaveCount + absentCount);
                    const paidDays = presentCount + Math.min(leaveCount + absentCount, 1) + unmarkedCount;
                    const baseSalary = employee.salary || 0;
                    const dueSalary = totalDays > 0 ? (paidDays / totalDays) * baseSalary : baseSalary;

                    return (
                      <tr key={employee.id} className="hover:bg-slate-50/50 transition">
                        <td className="sticky left-0 bg-white hover:bg-slate-50 font-medium text-slate-900 px-4 py-3 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-slate-100">
                          {employee.name}
                        </td>
                        <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                          {employee.role}
                        </td>
                        {matrixData.days.map((day) => {
                          const status = employee.records[day];
                          return (
                            <td key={day} className="px-1 py-3 text-center border-l border-slate-100/50">
                              {status === "PRESENT" && (
                                <span
                                  title={`${day}: Present`}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white"
                                >
                                  P
                                </span>
                              )}
                              {status === "ABSENT" && (
                                <span
                                  title={`${day}: Absent`}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white"
                                >
                                  A
                                </span>
                              )}
                              {status === "LEAVE" && (
                                <span
                                  title={`${day}: On Leave`}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white"
                                >
                                  L
                                </span>
                              )}
                              {!status && (
                                <span
                                  title={`${day}: Unmarked`}
                                  className="text-slate-300 font-semibold select-none"
                                >
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center font-medium text-slate-700 border-l border-slate-200 bg-slate-50/30">
                          {presentCount}
                        </td>
                        <td className="px-3 py-3 text-center font-medium text-slate-700 bg-slate-50/30">
                          {paidDays}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900 bg-slate-50/30 whitespace-nowrap">
                          {formatINR(dueSalary)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Matrix Legend */}
          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] text-slate-500">
            <span className="font-semibold">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500 text-[8px] font-bold text-white">P</span> Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">A</span> Absent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">L</span> On Leave
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">—</span> Unmarked / No log
            </span>
            <span className="sm:ml-auto text-slate-400 italic">
              * Salary Due = (Present + min(Leave + Absent, 1) + Unmarked) / (Total Days in Month) * Base Salary
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
