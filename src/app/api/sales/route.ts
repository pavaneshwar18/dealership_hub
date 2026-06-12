import { NextResponse } from "next/server";
import path from "node:path";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { getUploadsDir } from "@/lib/upload-utils";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "BRANCH_MANAGER" || !session.branchId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();

  const dateStr = formData.get("date") as string | null;
  const createdAt = dateStr ? new Date(dateStr) : undefined;

  const customerName = formData.get("customerName") as string | null;
  const customerFatherName = formData.get("customerFatherName") as string | null;
  const customerAddress = formData.get("customerAddress") as string | null;
  const modelName = formData.get("modelName") as string | null;
  const modelVariant = formData.get("modelVariant") as string | null;
  const totalAmount = Number(formData.get("totalAmount")) || 0;
  const downPayment = Number(formData.get("downPayment")) || 0;
  const financeAmount = Number(formData.get("financeAmount")) || 0;
  const financer = formData.get("financer") as string | null;
  const paymentType = (formData.get("paymentType") as string | null) || "Finance";
  const paymentMode = (formData.get("paymentMode") as string | null) || "Cash";
  let cashAmount = Number(formData.get("cashAmount")) || 0;
  let bankAmount = Number(formData.get("bankAmount")) || 0;

  if (paymentMode === "Cash") {
    cashAmount = downPayment;
    bankAmount = 0;
  } else if (paymentMode === "Bank Transfer") {
    cashAmount = 0;
    bankAmount = downPayment;
  }

  if (!customerName || !customerFatherName || !customerAddress || !modelName || (paymentType !== "Self" && !financer)) {
    return NextResponse.json(
      { error: "Customer name, father's name, address, model, and financing details are required" },
      { status: 400 },
    );
  }

  // Handle Aadhaar image upload
  let aadhaarImagePath: string | null = null;
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

    const ext = aadhaarFile.type.split("/")[1] === "jpeg" ? "jpg" : aadhaarFile.type.split("/")[1];
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(getUploadsDir(), "aadhaar");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await aadhaarFile.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);
    aadhaarImagePath = `aadhaar/${filename}`;
  }

  // Handle Additional documents upload
  const additionalDocs: string[] = [];
  const additionalFiles = formData.getAll("additionalDocs") as File[];
  if (additionalFiles && additionalFiles.length > 0) {
    const allowedDocs = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const docsUploadDir = path.join(getUploadsDir(), "documents");
    await mkdir(docsUploadDir, { recursive: true });

    for (const file of additionalFiles) {
      if (file.size === 0) continue;
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Each additional document must be under 5 MB" }, { status: 400 });
      }
      if (!allowedDocs.includes(file.type)) {
        return NextResponse.json({ error: "Additional documents must be PDF, JPEG, PNG, or WebP" }, { status: 400 });
      }
      const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
      const filename = `${randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(docsUploadDir, filename);
      await writeFile(filePath, buffer);
      additionalDocs.push(`documents/${filename}`);
    }
  }

  const finalFinancer = paymentType === "Self" ? "Self" : (financer || "Finance");
  const finalFinanceAmount = paymentType === "Self" ? 0 : financeAmount;

  const hasExchange = formData.get("hasExchange") === "true";
  const exchangeAmount = hasExchange ? (Number(formData.get("exchangeAmount")) || 0) : 0;
  const exchangeModel = hasExchange ? (formData.get("exchangeModel") as string | null) : null;
  const exchangeYear = hasExchange ? (formData.get("exchangeYear") as string | null) : null;

  const hasHandLoan = formData.get("hasHandLoan") === "true";
  const handLoanAmount = hasHandLoan ? (Number(formData.get("handLoanAmount")) || 0) : 0;

  const vehicleStockId = formData.get("vehicleStockId") as string | null;
  const salesExecutiveId = formData.get("salesExecutiveId") as string | null;

  let isPending = false;
  if (vehicleStockId) {
    const vehicle = await prisma.vehicleStock.findUnique({
      where: { id: vehicleStockId }
    });
    if (vehicle && totalAmount < vehicle.mrpAmount) {
      isPending = true;
    }
  }

  const saleReport = await prisma.saleReport.create({
    data: {
      branchId: session.branchId,
      submittedById: session.id,
      customerName,
      customerFatherName,
      customerAddress,
      modelName,
      modelVariant: modelVariant || null,
      totalAmount,
      downPayment,
      financeAmount: finalFinanceAmount,
      financer: finalFinancer,
      paymentType,
      paymentMode,
      cashAmount,
      bankAmount,
      aadhaarImagePath,
      additionalDocs,
      hasExchange,
      exchangeAmount,
      exchangeModel,
      exchangeYear,
      hasHandLoan,
      handLoanAmount,
      salesExecutiveId: salesExecutiveId || null,
      status: isPending ? "PENDING" : "APPROVED",
      exchangeVehicle: hasExchange ? {
        create: {
          modelName: exchangeModel || "Unknown Model",
          yearModel: exchangeYear || "Unknown Year",
          valuation: exchangeAmount,
          branchId: session.branchId,
          status: "AVAILABLE",
        }
      } : undefined,
      ...(createdAt ? { createdAt } : {}),
    },
  });

  if (vehicleStockId) {
    await prisma.vehicleStock.update({
      where: { id: vehicleStockId },
      data: {
        status: isPending ? "PENDING_SALE" : "SOLD",
        saleReportId: saleReport.id,
      },
    });
  }

  // Send email alert via Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      // 1. Fetch related data
      const branch = await prisma.branch.findUnique({
        where: { id: session.branchId }
      });
      let salesExecutiveName = "N/A";
      if (salesExecutiveId) {
        const staff = await prisma.staff.findUnique({ where: { id: salesExecutiveId } });
        if (staff) salesExecutiveName = staff.name;
      }
      let chassisNumber = "N/A";
      let engineNumber = "N/A";
      if (vehicleStockId) {
        const vehicle = await prisma.vehicleStock.findUnique({ where: { id: vehicleStockId } });
        if (vehicle) {
          chassisNumber = vehicle.chassisNumber;
          engineNumber = vehicle.engineNumber;
        }
      }

      // 2. Read attachments from disk
      const attachments: any[] = [];
      if (aadhaarImagePath) {
        try {
          const fileBuffer = await readFile(path.join(getUploadsDir(), aadhaarImagePath));
          const filename = path.basename(aadhaarImagePath);
          attachments.push({ filename, content: fileBuffer });
        } catch (e) {
          console.error("Failed to read Aadhaar image for attachment:", e);
        }
      }
      for (const docPath of additionalDocs) {
        try {
          const fileBuffer = await readFile(path.join(getUploadsDir(), docPath));
          const filename = path.basename(docPath);
          attachments.push({ filename, content: fileBuffer });
        } catch (e) {
          console.error(`Failed to read document ${docPath} for attachment:`, e);
        }
      }

      // 3. Send email using Resend
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: "Dealership Hub <onboarding@resend.dev>",
        to: "pavaneshwar04@gmail.com",
        subject: `New Sale Report Submitted - ${branch?.name || "Unknown Branch"} - ${customerName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #1e40af, #1e3a8a); color: white; padding: 24px; text-align: center;">
              <p style="text-transform: uppercase; font-size: 11px; letter-spacing: 0.15em; font-weight: 600; color: #93c5fd; margin: 0;">Vishnu Priya Automotives</p>
              <h2 style="margin: 8px 0 0 0; font-size: 20px;">New Sale Report Submitted</h2>
            </div>
            <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
              <h3 style="color: #1e3a8a; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-top: 0;">Customer Information</h3>
              <p style="margin: 6px 0;"><strong>Customer Name:</strong> ${customerName}</p>
              <p style="margin: 6px 0;"><strong>Father's Name:</strong> ${customerFatherName}</p>
              <p style="margin: 6px 0;"><strong>Address:</strong> ${customerAddress}</p>

              <h3 style="color: #1e3a8a; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-top: 24px;">Vehicle Details</h3>
              <p style="margin: 6px 0;"><strong>Model:</strong> ${modelName} ${modelVariant ? `(${modelVariant})` : ""}</p>
              <p style="margin: 6px 0;"><strong>Chassis Number:</strong> ${chassisNumber}</p>
              <p style="margin: 6px 0;"><strong>Engine Number:</strong> ${engineNumber}</p>
              <h3 style="color: #1e3a8a; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-top: 24px;">Additional Info</h3>
              <p style="margin: 6px 0;"><strong>Branch Location:</strong> ${branch?.name || "Unknown Branch"}</p>
              <p style="margin: 6px 0;"><strong>Sales Executive:</strong> ${salesExecutiveName}</p>
              <p style="margin: 6px 0;"><strong>Exchange:</strong> ${hasExchange ? `Yes (${exchangeModel}, Year: ${exchangeYear})` : "No"}</p>
              <p style="margin: 6px 0;"><strong>Hand Loan:</strong> ${hasHandLoan ? "Yes" : "No"}</p>
            </div>
            <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9;">
              This is an automated report. Uploaded documents are attached.
            </div>
          </div>
        `,
        attachments,
      });
      console.log("Resend Notification sent successfully");
    } catch (e) {
      console.error("Failed to send Resend email notification:", e);
    }
  }

  return NextResponse.json({ id: saleReport.id });
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");

  if (session.role === "BRANCH_MANAGER" && session.branchId) {
    const reports = await prisma.saleReport.findMany({
      where: { branchId: session.branchId },
      orderBy: { createdAt: "desc" },
      include: { branch: true },
    });
    return NextResponse.json(reports);
  }

  if (session.role === "ADMIN") {
    const where = branchId ? { branchId } : undefined;
    const reports = await prisma.saleReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { branch: true, submittedBy: true },
    });
    return NextResponse.json(reports);
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
