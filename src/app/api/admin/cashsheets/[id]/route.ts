import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT: Admin updates cash sheet properties (e.g. openingBalance)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { openingBalance } = body;

    if (typeof openingBalance !== "number" || openingBalance < 0) {
      return NextResponse.json(
        { error: "Valid opening balance is required" },
        { status: 400 }
      );
    }

    const sheet = await prisma.cashSheet.findUnique({
      where: { id },
      include: { transactions: true },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Cash sheet not found" }, { status: 404 });
    }

    // Recalculate closing balance if sheet is SUBMITTED
    let closingBalance = sheet.closingBalance;
    if (sheet.status === "SUBMITTED") {
      let totalDebits = 0;
      let totalCredits = 0;
      sheet.transactions.forEach((tx) => {
        if (tx.type === "DEBIT") totalDebits += tx.amount;
        else if (tx.type === "CREDIT") totalCredits += tx.amount;
      });
      closingBalance = openingBalance + totalDebits - totalCredits;
    }

    const updated = await prisma.cashSheet.update({
      where: { id },
      data: {
        openingBalance,
        closingBalance,
      },
      include: {
        transactions: {
          orderBy: { createdAt: "asc" },
        },
        branch: true,
        submittedBy: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update cash sheet" },
      { status: 500 }
    );
  }
}

// DELETE: Admin completely erases a cash sheet
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    const sheet = await prisma.cashSheet.findUnique({
      where: { id },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Cash sheet not found" }, { status: 404 });
    }

    await prisma.cashSheet.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete cash sheet" },
      { status: 500 }
    );
  }
}
