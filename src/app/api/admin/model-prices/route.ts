import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const configs = await prisma.vehiclePriceConfig.findMany();
    return NextResponse.json(configs);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { modelName, modelVariant, invoiceAmount, mrpAmount } = body;

    if (!modelName) {
      return NextResponse.json({ error: "Model name is required" }, { status: 400 });
    }

    if (invoiceAmount === undefined || invoiceAmount === null || isNaN(Number(invoiceAmount))) {
      return NextResponse.json({ error: "Invoice amount is required and must be a valid number" }, { status: 400 });
    }

    if (mrpAmount === undefined || mrpAmount === null || isNaN(Number(mrpAmount))) {
      return NextResponse.json({ error: "MRP amount is required and must be a valid number" }, { status: 400 });
    }

    const parsedInvoice = parseFloat(invoiceAmount);
    const parsedMrp = parseFloat(mrpAmount);

    if (parsedInvoice < 0 || parsedMrp < 0) {
      return NextResponse.json({ error: "Amount fields cannot be negative" }, { status: 400 });
    }

    const variant = modelVariant || "";

    const config = await prisma.vehiclePriceConfig.upsert({
      where: {
        modelName_modelVariant: {
          modelName,
          modelVariant: variant,
        },
      },
      update: {
        invoiceAmount: parsedInvoice,
        mrpAmount: parsedMrp,
      },
      create: {
        modelName,
        modelVariant: variant,
        invoiceAmount: parsedInvoice,
        mrpAmount: parsedMrp,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
