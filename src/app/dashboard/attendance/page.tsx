import { Navbar } from "@/components/Navbar";
import { requireBranchManager } from "@/lib/auth";
import { todayIST, formatDateToISTString } from "@/lib/format";
import { ManagerAttendanceClient } from "@/components/ManagerAttendanceClient";

export default async function ManagerAttendancePage() {
  const session = await requireBranchManager();
  const todayStr = formatDateToISTString(todayIST());

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar user={session} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Branch Attendance</h1>
          <p className="mt-2 text-slate-500">
            Log daily attendance for staff at the {session.branchName} branch.
          </p>
        </div>

        <ManagerAttendanceClient defaultDate={todayStr} />
      </main>
    </div>
  );
}
