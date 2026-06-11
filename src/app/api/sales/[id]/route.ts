import { NextResponse } from "next/server";
import path from "node:path";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const report = await prisma.saleReport.findUnique({
    where: { id },
    include: { branch: true, submittedBy: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Sale report not found" }, { status: 404 });
  }

  const canView =
    session.role === "ADMIN" ||
    (session.role === "BRANCH_MANAGER" && report.branchId === session.branchId);

  if (!canView) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(report);
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.saleReport.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Sale report not found" }, { status: 404 });
  }

  const formData = await request.formData();

  const dateStr = formData.get("date") as string | null;
  const createdAt = dateStr ? new Date(dateStr) : undefined;

  const customerName = (formData.get("customerName") as string) || existing.customerName;
  const customerFatherName =
    (formData.get("customerFatherName") as string) || existing.customerFatherName;
  const customerAddress = (formData.get("customerAddress") as string) || existing.customerAddress;
  const modelName = (formData.get("modelName") as string) || existing.modelName;
  const modelVariant = formData.has("modelVariant")
    ? (formData.get("modelVariant") as string) || null
    : existing.modelVariant;
  const totalAmount = formData.has("totalAmount")
    ? Number(formData.get("totalAmount")) || 0
    : existing.totalAmount;
  const downPayment = formData.has("downPayment")
    ? Number(formData.get("downPayment")) || 0
    : existing.downPayment;
  const financeAmount = formData.has("financeAmount")
    ? Number(formData.get("financeAmount")) || 0
    : existing.financeAmount;
  const financer = (formData.get("financer") as string) || existing.financer;
  const paymentType = formData.has("paymentType")
    ? (formData.get("paymentType") as string) || "Finance"
    : existing.paymentType;
  const paymentMode = formData.has("paymentMode")
    ? (formData.get("paymentMode") as string) || "Cash"
    : existing.paymentMode;
  let cashAmount = formData.has("cashAmount")
    ? Number(formData.get("cashAmount")) || 0
    : existing.cashAmount;
  let bankAmount = formData.has("bankAmount")
    ? Number(formData.get("bankAmount")) || 0
    : existing.bankAmount;

  const hasExchange = formData.has("hasExchange")
    ? formData.get("hasExchange") === "true"
    : existing.hasExchange;
  const exchangeAmount = formData.has("exchangeAmount")
    ? (Number(formData.get("exchangeAmount")) || 0)
    : existing.exchangeAmount;
  const exchangeModel = formData.has("exchangeModel")
    ? (formData.get("exchangeModel") as string | null)
    : existing.exchangeModel;
  const exchangeYear = formData.has("exchangeYear")
    ? (formData.get("exchangeYear") as string | null)
    : existing.exchangeYear;

  const hasHandLoan = formData.has("hasHandLoan")
    ? formData.get("hasHandLoan") === "true"
    : existing.hasHandLoan;
  const handLoanAmount = formData.has("handLoanAmount")
    ? (Number(formData.get("handLoanAmount")) || 0)
    : existing.handLoanAmount;

  if (paymentMode === "Cash") {
    cashAmount = downPayment;
    bankAmount = 0;
  } else if (paymentMode === "Bank Transfer") {
    cashAmount = 0;
    bankAmount = downPayment;
  }

  // Handle Aadhaar image replacement
  let aadhaarImagePath = existing.aadhaarImagePath;
  const aadhaarFile = formData.get("aadhaarImage") as File | null;
  if (aadhaarFile && aadhaarFile.size > 0) {
    if (aadhaarFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Aadhaar image must be under 5 MB" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(aadhaarFile.type)) {
      return NextResponse.json(
        { error: "Aadhaar image must be JPEG, PNG, or WebP" },
        { status: 400 },
      );
    }

    // Delete old file if exists
    if (existing.aadhaarImagePath) {
      try {
        await unlink(path.join(process.cwd(), "uploads", existing.aadhaarImagePath));
      } catch {
        // ignore if old file doesn't exist
      }
    }

    const ext = aadhaarFile.type.split("/")[1] === "jpeg" ? "jpg" : aadhaarFile.type.split("/")[1];
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "uploads", "aadhaar");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await aadhaarFile.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    aadhaarImagePath = `aadhaar/${filename}`;
  }

  const finalFinancer = paymentType === "Self" ? "Self" : financer;
  const finalFinanceAmount = paymentType === "Self" ? 0 : financeAmount;

  const salesExecutiveId = formData.has("salesExecutiveId")
    ? (formData.get("salesExecutiveId") as string) || null
    : existing.salesExecutiveId;

  const status = formData.has("status")
    ? (formData.get("status") as any)
    : existing.status;
  const adminComment = formData.has("adminComment")
    ? (formData.get("adminComment") as string | null)
    : existing.adminComment;

  const report = await prisma.saleReport.update({
    where: { id },
    data: {
      customerName,
      customerFatherName,
      customerAddress,
      modelName,
      modelVariant,
      totalAmount,
      downPayment,
      financeAmount: finalFinanceAmount,
      financer: finalFinancer,
      paymentType,
      paymentMode,
      cashAmount,
      bankAmount,
      aadhaarImagePath,
      hasExchange,
      exchangeAmount: hasExchange ? exchangeAmount : 0,
      exchangeModel: hasExchange ? exchangeModel : null,
      exchangeYear: hasExchange ? exchangeYear : null,
      hasHandLoan,
      handLoanAmount: hasHandLoan ? handLoanAmount : 0,
      salesExecutiveId,
      status,
      adminComment,
      ...(createdAt ? { createdAt } : {}),
    },
  });

  // Sync exchange vehicle
  if (hasExchange) {
    const existingVehicle = await prisma.exchangeVehicle.findUnique({
      where: { saleReportId: id },
    });
    if (existingVehicle) {
      await prisma.exchangeVehicle.update({
        where: { saleReportId: id },
        data: {
          modelName: exchangeModel || "Unknown Model",
          yearModel: exchangeYear || "Unknown Year",
          valuation: exchangeAmount,
        },
      });
    } else {
      await prisma.exchangeVehicle.create({
        data: {
          saleReportId: id,
          modelName: exchangeModel || "Unknown Model",
          yearModel: exchangeYear || "Unknown Year",
          valuation: exchangeAmount,
          branchId: existing.branchId,
          status: "AVAILABLE",
        },
      });
    }
  } else {
    const existingVehicle = await prisma.exchangeVehicle.findUnique({
      where: { saleReportId: id },
    });
    if (existingVehicle) {
      await prisma.exchangeVehicle.delete({
        where: { saleReportId: id },
      });
    }
  }

  const vehicleStockId = formData.get("vehicleStockId") as string | null;
  const targetStatus = report.status;

  if (formData.has("vehicleStockId")) {
    const oldStock = await prisma.vehicleStock.findFirst({
      where: { saleReportId: id },
    });
    if (oldStock && oldStock.id !== vehicleStockId) {
      await prisma.vehicleStock.update({
        where: { id: oldStock.id },
        data: {
          status: "AVAILABLE",
          saleReportId: null,
        },
      });
    }

    if (vehicleStockId) {
      let nextStockStatus: any = "SOLD";
      if (targetStatus === "PENDING") {
        nextStockStatus = "PENDING_SALE";
      } else if (targetStatus === "REJECTED") {
        nextStockStatus = "AVAILABLE";
      }

      await prisma.vehicleStock.update({
        where: { id: vehicleStockId },
        data: {
          status: nextStockStatus,
          saleReportId: targetStatus === "REJECTED" ? null : id,
        },
      });
    }
  } else if (formData.has("status")) {
    const currentStock = await prisma.vehicleStock.findFirst({
      where: { saleReportId: id },
    });
    if (currentStock) {
      let nextStockStatus: any = "SOLD";
      if (targetStatus === "PENDING") {
        nextStockStatus = "PENDING_SALE";
      } else if (targetStatus === "REJECTED") {
        nextStockStatus = "AVAILABLE";
      }

      await prisma.vehicleStock.update({
        where: { id: currentStock.id },
        data: {
          status: nextStockStatus,
          saleReportId: targetStatus === "REJECTED" ? null : id,
        },
      });
    }
  }

  return NextResponse.json(report);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.saleReport.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Sale report not found" }, { status: 404 });
  }

  // Delete Aadhaar image file if exists
  if (existing.aadhaarImagePath) {
    try {
      await unlink(path.join(process.cwd(), "uploads", existing.aadhaarImagePath));
    } catch {
      // ignore
    }
  }

  // Reset vehicle stock status to AVAILABLE
  const linkedStock = await prisma.vehicleStock.findFirst({
    where: { saleReportId: id },
  });
  if (linkedStock) {
    await prisma.vehicleStock.update({
      where: { id: linkedStock.id },
      data: {
        status: "AVAILABLE",
        saleReportId: null,
      },
    });
  }

  await prisma.saleReport.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
