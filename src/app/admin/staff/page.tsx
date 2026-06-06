import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminStaffClient } from "@/components/AdminStaffClient";

export default async function AdminStaffPage() {
  await requireAdmin();

  // Fetch all staff members including branch
  const staff = await prisma.staff.findMany({
    include: {
      branch: true,
    },
    orderBy: [
      { branch: { name: "asc" } },
      { name: "asc" },
    ],
  });

  // Fetch all branches for the dropdowns
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
  });

  // Map to a clean schema
  const formattedStaff = staff.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    salary: s.salary,
    active: s.active,
    branchId: s.branchId,
    branchName: s.branch.name,
  }));

  const formattedBranches = branches.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Staff Directory</h1>
        <p className="mt-2 text-slate-500">
          Manage system employees across all 5 Bajaj dealership branches.
        </p>
      </div>

      <AdminStaffClient initialStaff={formattedStaff} branches={formattedBranches} />
    </>
  );
}
