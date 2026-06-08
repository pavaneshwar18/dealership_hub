import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Recalculates and updates the closing balance of a cash sheet if it is submitted
async function syncClosingBalance(sheetId: string) {
  const sheet = await prisma.cashSheet.findUnique({
    where: { id: sheetId },
    include: { transactions: true },
  });

  if (!sheet || sheet.status !== "SUBMITTED") return;

  let totalDebits = 0;
  let totalCredits = 0;
  sheet.transactions.forEach((tx) => {
    if (tx.type === "DEBIT") totalDebits += tx.amount;
    else if (tx.type === "CREDIT") totalCredits += tx.amount;
  });

  const closingBalance = sheet.openingBalance + totalDebits - totalCredits;

  await prisma.cashSheet.update({
    where: { id: sheetId },
    data: { closingBalance },
  });
}

// POST: Admin adds a new transaction to any cash sheet
export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { type, amount, description, staffId } = body;

    if (!type || !["CREDIT", "DEBIT"].includes(type)) {
      return NextResponse.json(
        { error: "Transaction type must be CREDIT or DEBIT" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const sheet = await prisma.cashSheet.findUnique({
      where: { id },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Cash sheet not found" }, { status: 404 });
    }

    const transaction = await prisma.cashTransaction.create({
      data: {
        cashSheetId: id,
        type,
        amount,
        description: description.trim(),
        staffId: staffId && staffId !== "" ? staffId : null,
      },
    });

    // Update closing balance if sheet is finalized/submitted
    await syncClosingBalance(id);

    return NextResponse.json(transaction);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add transaction" },
      { status: 500 }
    );
  }
}

// DELETE: Admin removes a transaction from any cash sheet
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");

    if (!transactionId) {
      return NextResponse.json(
        { error: "transactionId query parameter is required" },
        { status: 400 }
      );
    }

    const sheet = await prisma.cashSheet.findUnique({
      where: { id },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Cash sheet not found" }, { status: 404 });
    }

    const transaction = await prisma.cashTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.cashSheetId !== id) {
      return NextResponse.json(
        { error: "Transaction not found in this cash sheet" },
        { status: 404 }
      );
    }

    await prisma.cashTransaction.delete({
      where: { id: transactionId },
    });

    // Update closing balance if sheet is finalized/submitted
    await syncClosingBalance(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
