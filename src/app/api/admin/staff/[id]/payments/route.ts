import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET: Fetch all salary/advance payment records for a specific staff member
export async function GET(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Staff member ID is required" },
        { status: 400 }
      );
    }

    // 1. Fetch expenses (overheads) linked to this staff member
    const expenses = await prisma.dealershipExpense.findMany({
      where: { staffId: id },
      include: {
        branch: true,
        recordedBy: true,
      },
      orderBy: { date: "desc" },
    });

    // 2. Fetch cash transactions linked to this staff member
    const transactions = await prisma.cashTransaction.findMany({
      where: { staffId: id },
      include: {
        cashSheet: {
          include: { branch: true },
        },
      },
      orderBy: { cashSheet: { date: "desc" } },
    });

    // 3. Combine and map into a unified list of payments
    const payments: Array<{
      id: string;
      date: string;
      amount: number;
      description: string;
      source: string;
      recordedBy: string;
    }> = [];

    expenses.forEach((e) => {
      payments.push({
        id: `exp-${e.id}`,
        date: e.date.toISOString(),
        amount: e.amount,
        description: e.title + (e.description ? ` (${e.description})` : ""),
        source: `Overhead Logs [${e.category}]${e.branch ? ` (${e.branch.name})` : ""}`,
        recordedBy: e.recordedBy.name,
      });
    });

    transactions.forEach((tx) => {
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

    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch staff payments history" },
      { status: 500 }
    );
  }
}
