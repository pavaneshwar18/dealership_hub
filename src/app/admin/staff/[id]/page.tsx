import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminStaffDetailsClient } from "@/components/AdminStaffDetailsClient";

type AdminStaffDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminStaffDetailPage({ params }: AdminStaffDetailPageProps) {
  // Check authorization
  await requireAdmin();
  const { id } = await params;

  if (!id) {
    notFound();
  }

  // Fetch staff details and relationships
  const staff = await prisma.staff.findUnique({
    where: { id },
    include: {
      branch: true,
      attendance: {
        orderBy: { date: "desc" },
      },
      expenses: {
        include: {
          recordedBy: true,
          branch: true,
        },
        orderBy: { date: "desc" },
      },
      transactions: {
        include: {
          cashSheet: {
            include: { branch: true },
          },
        },
        orderBy: { cashSheet: { date: "desc" } },
      },
    },
  });

  if (!staff) {
    notFound();
  }

  // Calculate attendance metrics
  const totalDays = staff.attendance.length;
  const presentDays = staff.attendance.filter((a) => a.status === "PRESENT").length;
  const absentDays = staff.attendance.filter((a) => a.status === "ABSENT").length;
  const leaveDays = staff.attendance.filter((a) => a.status === "LEAVE").length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  // Build unified payments list
  const payments: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
    source: string;
    recordedBy: string;
  }> = [];

  staff.expenses.forEach((e) => {
    payments.push({
      id: `exp-${e.id}`,
      date: e.date.toISOString(),
      amount: e.amount,
      description: e.title + (e.description ? ` (${e.description})` : ""),
      source: `Overhead Logs [${e.category}]${e.branch ? ` (${e.branch.name})` : ""}`,
      recordedBy: e.recordedBy.name,
    });
  });

  staff.transactions.forEach((tx) => {
    payments.push({
      id: `tx-${tx.id}`,
      date: tx.cashSheet.date.toISOString(),
      amount: tx.amount,
      description: tx.description,
      source: `Cash Sheet (${tx.cashSheet.branch.name})`,
      recordedBy: "Branch Manager",
    });
  });

  // Sort chronologically, latest first
  payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Fetch branches for editing
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
  });

  // Format staff details for the client view
  const formattedStaff = {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    salary: staff.salary,
    active: staff.active,
    createdAt: staff.createdAt.toISOString(),
    branchName: staff.branch.name,
    branchId: staff.branchId,
    email: staff.email,
    phone: staff.phone,
    address: staff.address,
    emergencyContact: staff.emergencyContact,
    dob: staff.dob,
    photoPath: staff.photoPath,
  };

  const attendanceStats = {
    totalDays,
    presentDays,
    absentDays,
    leaveDays,
    attendanceRate,
  };

  const formattedBranches = branches.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  const formattedAttendance = staff.attendance.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    status: a.status,
    notes: a.notes,
  }));

  return (
    <>
      <AdminStaffDetailsClient
        staff={formattedStaff}
        attendanceStats={attendanceStats}
        payments={payments}
        branches={formattedBranches}
        attendance={formattedAttendance}
      />
    </>
  );
}
