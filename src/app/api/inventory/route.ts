import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { chassisNumber, engineNumber, modelName, modelVariant, color, receivedDate } = body;

    if (!chassisNumber || !engineNumber || !modelName) {
      return NextResponse.json(
        { error: "Chassis number, engine number, and model name are required" },
        { status: 400 }
      );
    }

    // Lookup Miryalaguda branch
    let branch = await prisma.branch.findUnique({
      where: { name: "Miryalaguda" }
    });

    if (!branch) {
      // Fallback: use first branch available
      branch = await prisma.branch.findFirst();
      if (!branch) {
        return NextResponse.json(
          { error: "No branch found in database. Please register a branch first." },
          { status: 400 }
        );
      }
    }

    // Check if chassisNumber or engineNumber already exists
    const existingChassis = await prisma.vehicleStock.findUnique({
      where: { chassisNumber }
    });
    if (existingChassis) {
      return NextResponse.json(
        { error: `Vehicle with Chassis Number '${chassisNumber}' already exists` },
        { status: 400 }
      );
    }

    const existingEngine = await prisma.vehicleStock.findUnique({
      where: { engineNumber }
    });
    if (existingEngine) {
      return NextResponse.json(
        { error: `Vehicle with Engine Number '${engineNumber}' already exists` },
        { status: 400 }
      );
    }

    const item = await prisma.vehicleStock.create({
      data: {
        chassisNumber,
        engineNumber,
        modelName,
        modelVariant: modelVariant || null,
        color: color || null,
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        branchId: branch.id
      }
    });

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create inventory item" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status");
    const modelName = searchParams.get("modelName");

    const where: any = {};
    if (session.role === "BRANCH_MANAGER") {
      where.branchId = session.branchId!;
    } else if (branchId && branchId !== "ALL") {
      where.branchId = branchId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }
    if (modelName && modelName !== "ALL") {
      where.modelName = modelName;
    }

    const stock = await prisma.vehicleStock.findMany({
      where,
      orderBy: { receivedDate: "desc" },
      include: {
        branch: true
      }
    });

    return NextResponse.json(stock);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch inventory items" }, { status: 500 });
  }
}
