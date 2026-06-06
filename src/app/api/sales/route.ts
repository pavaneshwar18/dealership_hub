import { NextResponse } from "next/server";
import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "BRANCH_MANAGER" || !session.branchId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();

  const customerName = formData.get("customerName") as string | null;
  const customerFatherName = formData.get("customerFatherName") as string | null;
  const customerAddress = formData.get("customerAddress") as string | null;
  const modelName = formData.get("modelName") as string | null;
  const modelVariant = formData.get("modelVariant") as string | null;
  const totalAmount = Number(formData.get("totalAmount")) || 0;
  const downPayment = Number(formData.get("downPayment")) || 0;
  const financeAmount = Number(formData.get("financeAmount")) || 0;
  const financer = formData.get("financer") as string | null;

  if (!customerName || !customerFatherName || !customerAddress || !modelName || !financer) {
    return NextResponse.json(
      { error: "Customer name, father's name, address, model, and financer are required" },
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
    const uploadDir = path.join(process.cwd(), "uploads", "aadhaar");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await aadhaarFile.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);
    aadhaarImagePath = `aadhaar/${filename}`;
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
      financeAmount,
      financer,
      aadhaarImagePath,
    },
  });

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
