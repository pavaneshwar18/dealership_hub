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
    const { branchId, status } = body;

    const existing = await prisma.exchangeVehicle.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Exchange vehicle not found" }, { status: 404 });
    }

    const data: any = {};
    if (branchId) data.branchId = branchId;
    if (status) data.status = status;

    const updated = await prisma.exchangeVehicle.update({
      where: { id },
      data,
      include: { branch: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update exchange vehicle" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const existing = await prisma.exchangeVehicle.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Exchange vehicle not found" }, { status: 404 });
    }

    await prisma.exchangeVehicle.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete exchange vehicle" }, { status: 500 });
  }
}
