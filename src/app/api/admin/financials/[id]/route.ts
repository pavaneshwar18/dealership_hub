import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// DELETE: Remove an expense record by its ID
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Expense record ID is required." },
        { status: 400 }
      );
    }

    await prisma.dealershipExpense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete expense record" },
      { status: 500 }
    );
  }
}
