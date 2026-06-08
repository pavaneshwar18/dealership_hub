import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBranchManager } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT: Submit/finalize the cash sheet
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await requireBranchManager();
    const { id } = await params;

    const sheet = await prisma.cashSheet.findUnique({
      where: { id },
      include: { transactions: true },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Cash sheet not found" }, { status: 404 });
    }

    if (sheet.branchId !== session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (sheet.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "Cash sheet has already been submitted" },
        { status: 400 }
      );
    }

    // Calculate closing balance (Debit = Cash In/Receipts, Credit = Cash Out/Payments)
    let totalDebits = 0;
    let totalCredits = 0;
    sheet.transactions.forEach((t) => {
      if (t.type === "DEBIT") totalDebits += t.amount;
      else totalCredits += t.amount;
    });

    const closingBalance = sheet.openingBalance + totalDebits - totalCredits;

    const updated = await prisma.cashSheet.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        closingBalance,
        submittedAt: new Date(),
      },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
        },
        branch: true,
        submittedBy: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to submit cash sheet" },
      { status: 500 }
    );
  }
}
