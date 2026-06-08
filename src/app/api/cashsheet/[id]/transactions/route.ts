import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBranchManager } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST: Add a new transaction to a DRAFT cash sheet
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await requireBranchManager();
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

    if (sheet.branchId !== session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (sheet.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "Cannot add transactions to a submitted cash sheet" },
        { status: 400 }
      );
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

    return NextResponse.json(transaction);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add transaction" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a transaction from a DRAFT cash sheet
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await requireBranchManager();
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

    if (sheet.branchId !== session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (sheet.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "Cannot remove transactions from a submitted cash sheet" },
        { status: 400 }
      );
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
