import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// GET: Admin endpoint to list all cash sheets, filterable by branch and date range
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status");

    const where: any = {};

    if (branchId && branchId !== "ALL") {
      where.branchId = branchId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    } else {
      // By default, only show submitted sheets to admin
      where.status = "SUBMITTED";
    }

    if (from) {
      where.date = { ...where.date, gte: new Date(from + "T00:00:00.000Z") };
    }
    if (to) {
      where.date = { ...where.date, lte: new Date(to + "T23:59:59.999Z") };
    }

    const sheets = await prisma.cashSheet.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        branch: true,
        submittedBy: true,
        transactions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(sheets);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch cash sheets" },
      { status: 500 }
    );
  }
}
