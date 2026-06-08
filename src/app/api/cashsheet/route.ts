import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBranchManager } from "@/lib/auth";
import { formatDateToISTString } from "@/lib/format";

// GET: Fetch today's cash sheet for the logged-in manager (auto-creates DRAFT if none exists)
export async function GET() {
  try {
    const session = await requireBranchManager();
    const todayStr = formatDateToISTString(new Date());
    const todayDate = new Date(todayStr + "T00:00:00.000Z");

    // Try to find today's sheet
    let sheet = await prisma.cashSheet.findUnique({
      where: {
        branchId_date: {
          branchId: session.branchId!,
          date: todayDate,
        },
      },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
        },
        branch: true,
        submittedBy: true,
      },
    });

    if (!sheet) {
      // Determine opening balance from previous submitted sheet
      const previousSheet = await prisma.cashSheet.findFirst({
        where: {
          branchId: session.branchId!,
          status: "SUBMITTED",
          date: { lt: todayDate },
        },
        orderBy: { date: "desc" },
      });

      const openingBalance = previousSheet ? previousSheet.closingBalance : 0;

      sheet = await prisma.cashSheet.create({
        data: {
          date: todayDate,
          branchId: session.branchId!,
          submittedById: session.id,
          openingBalance,
        },
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
          },
          branch: true,
          submittedBy: true,
        },
      });
    }

    return NextResponse.json(sheet);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch cash sheet" },
      { status: 500 }
    );
  }
}

// POST: Update the opening balance for today's sheet (manual override for first use)
export async function POST(request: Request) {
  try {
    const session = await requireBranchManager();
    const body = await request.json();
    const { openingBalance } = body;

    if (typeof openingBalance !== "number" || openingBalance < 0) {
      return NextResponse.json(
        { error: "Valid opening balance is required" },
        { status: 400 }
      );
    }

    const todayStr = formatDateToISTString(new Date());
    const todayDate = new Date(todayStr + "T00:00:00.000Z");

    const sheet = await prisma.cashSheet.findUnique({
      where: {
        branchId_date: {
          branchId: session.branchId!,
          date: todayDate,
        },
      },
    });

    if (!sheet) {
      return NextResponse.json(
        { error: "No cash sheet found for today" },
        { status: 404 }
      );
    }

    if (sheet.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "Cannot modify a submitted cash sheet" },
        { status: 400 }
      );
    }

    const updated = await prisma.cashSheet.update({
      where: { id: sheet.id },
      data: { openingBalance },
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
      { error: error.message || "Failed to update opening balance" },
      { status: 500 }
    );
  }
}
