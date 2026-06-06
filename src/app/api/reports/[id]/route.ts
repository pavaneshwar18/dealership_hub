import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { startOfDayIST } from "@/lib/format";
import { prisma } from "@/lib/db";
import { parseReportBody } from "@/lib/reports";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.dailyReport.findUnique({
    where: { id },
    include: { branch: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const isOwner =
    session.role === "BRANCH_MANAGER" && existing.branchId === session.branchId;
  const isAdmin = session.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (isAdmin && "adminComment" in body) {
    const report = await prisma.dailyReport.update({
      where: { id },
      data: {
        adminComment: body.adminComment ? String(body.adminComment) : null,
        status: body.markReviewed ? "REVIEWED" : existing.status,
        reviewedAt: body.markReviewed ? new Date() : existing.reviewedAt,
      },
    });
    return NextResponse.json(report);
  }

  if (!isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseReportBody(body);

  // Delete existing stock entries and re-create
  await prisma.stockEntry.deleteMany({ where: { dailyReportId: id } });

  const report = await prisma.dailyReport.update({
    where: { id },
    data: {
      date: parsed.date ? startOfDayIST(new Date(parsed.date)) : existing.date,
      vehiclesSold: parsed.vehiclesSold,
      salesValue: parsed.salesValue,
      bookings: parsed.bookings,
      pendingDeliveries: parsed.pendingDeliveries,
      testDrives: parsed.testDrives,
      serviceJobs: parsed.serviceJobs,
      serviceRevenue: parsed.serviceRevenue,
      cashCollected: parsed.cashCollected,
      pendingPayments: parsed.pendingPayments,
      staffPresent: parsed.staffPresent,
      customerComplaints: parsed.customerComplaints,
      highlights: parsed.highlights,
      issues: parsed.issues,
      notes: parsed.notes,
      status: "SUBMITTED",
      reviewedAt: null,
      adminComment: null,
      stockEntries: {
        create: (parsed.stockEntries ?? []).map((e) => ({
          modelName: e.modelName,
          modelVariant: e.modelVariant,
          stockOnHand: e.stockOnHand,
          newStockReceived: e.newStockReceived,
        })),
      },
    },
    include: { stockEntries: true },
  });

  return NextResponse.json(report);
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: { branch: true, submittedBy: true, stockEntries: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const canView =
    session.role === "ADMIN" ||
    (session.role === "BRANCH_MANAGER" && report.branchId === session.branchId);

  if (!canView) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(report);
}
