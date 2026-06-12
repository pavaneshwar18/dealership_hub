import { requireBackOffice } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminAttendanceClient } from "@/components/AdminAttendanceClient";

export default async function BackOfficeAttendancePage() {
  await requireBackOffice();

  // Fetch branches for filter selection
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
  });

  const formattedBranches = branches.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Attendance Registry</h1>
        <p className="mt-2 text-slate-500">
          Track employee daily attendance logs and analyze monthly attendance matrices across branches.
        </p>
      </div>

      <AdminAttendanceClient branches={formattedBranches} />
    </>
  );
}
