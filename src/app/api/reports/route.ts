import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { startOfDayIST } from "@/lib/format";
import { prisma } from "@/lib/db";
import { parseReportBody } from "@/lib/reports";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "BRANCH_MANAGER" || !session.branchId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = parseReportBody(await request.json());
  if (!body.date) {
    return NextResponse.json({ error: "Report date is required" }, { status: 400 });
  }

  const reportDate = startOfDayIST(new Date(body.date));

  try {
    const report = await prisma.dailyReport.create({
      data: {
        date: reportDate,
        branchId: session.branchId,
        submittedById: session.id,
        vehiclesSold: body.vehiclesSold,
        salesValue: body.salesValue,
        bookings: body.bookings,
        pendingDeliveries: body.pendingDeliveries,
        testDrives: body.testDrives,
        serviceJobs: body.serviceJobs,
        serviceRevenue: body.serviceRevenue,
        cashCollected: body.cashCollected,
        pendingPayments: body.pendingPayments,
        staffPresent: body.staffPresent,
        customerComplaints: body.customerComplaints,
        highlights: body.highlights,
        issues: body.issues,
        notes: body.notes,
        stockEntries: {
          create: (body.stockEntries ?? []).map((e) => ({
            modelName: e.modelName,
            modelVariant: e.modelVariant,
            stockOnHand: e.stockOnHand,
            newStockReceived: e.newStockReceived,
          })),
        },
      },
    });

    return NextResponse.json({ id: report.id });
  } catch {
    return NextResponse.json(
      { error: "A report already exists for this date. Edit the existing report instead." },
      { status: 409 },
    );
  }
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  if (session.role === "BRANCH_MANAGER" && session.branchId) {
    const reports = await prisma.dailyReport.findMany({
      where: { branchId: session.branchId },
      orderBy: { date: "desc" },
      take: 30,
      include: { branch: true, stockEntries: true },
    });
    return NextResponse.json(reports);
  }

  if (session.role === "ADMIN") {
    const where = dateParam
      ? { date: startOfDayIST(new Date(dateParam)) }
      : undefined;

    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: [{ date: "desc" }, { branch: { name: "asc" } }],
      include: { branch: true, submittedBy: true, stockEntries: true },
    });
    return NextResponse.json(reports);
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
