import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const { branchId, status, color, invoiceBillAmount, mrpAmount } = body;

    const existing = await prisma.vehicleStock.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Vehicle stock item not found" }, { status: 404 });
    }

    const data: any = {};
    if (branchId) data.branchId = branchId;
    if (status) data.status = status;
    if (color) data.color = color;
    if (invoiceBillAmount !== undefined) {
      if (invoiceBillAmount === null || invoiceBillAmount === "" || isNaN(Number(invoiceBillAmount))) {
        return NextResponse.json({ error: "Invoice bill amount must be a valid number" }, { status: 400 });
      }
      const parsedAmount = parseFloat(invoiceBillAmount);
      if (parsedAmount < 0) {
        return NextResponse.json({ error: "Invoice bill amount cannot be negative" }, { status: 400 });
      }
      data.invoiceBillAmount = parsedAmount;
    }
    if (mrpAmount !== undefined) {
      if (mrpAmount === null || mrpAmount === "" || isNaN(Number(mrpAmount))) {
        return NextResponse.json({ error: "MRP amount must be a valid number" }, { status: 400 });
      }
      const parsedMrp = parseFloat(mrpAmount);
      if (parsedMrp < 0) {
        return NextResponse.json({ error: "MRP amount cannot be negative" }, { status: 400 });
      }
      data.mrpAmount = parsedMrp;
    }

    const updated = await prisma.vehicleStock.update({
      where: { id },
      data,
      include: { branch: true }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update inventory item" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const existing = await prisma.vehicleStock.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Vehicle stock item not found" }, { status: 404 });
    }

    await prisma.vehicleStock.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete inventory item" }, { status: 500 });
  }
}
