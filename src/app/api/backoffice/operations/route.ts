import { NextResponse } from "next/server";
import { requireAdminOrBackOffice } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateToISTString } from "@/lib/format";

export async function GET() {
  try {
    await requireAdminOrBackOffice();

    const pendingSales = await prisma.saleReport.findMany({
      where: {
        OR: [
          { trCompleted: false },
          { invoiceCompleted: false },
          { insuranceCompleted: false },
          { numberPlateCompleted: false },
        ],
      },
      orderBy: { createdAt: "asc" }, // Oldest first to prioritize older sales
      include: {
        branch: true,
        vehicleStock: true,
      },
    });

    const formattedSales = pendingSales.map((sale) => ({
      id: sale.id,
      date: formatDateToISTString(sale.createdAt),
      branchName: sale.branch.name,
      customerName: sale.customerName,
      modelName: sale.modelName,
      chassisNumber: sale.vehicleStock?.chassisNumber || "—",
      trCompleted: sale.trCompleted,
      invoiceCompleted: sale.invoiceCompleted,
      insuranceCompleted: sale.insuranceCompleted,
      numberPlateCompleted: sale.numberPlateCompleted,
      trDate: sale.trDate ? formatDateToISTString(sale.trDate) : null,
      trNumber: sale.trNumber,
      invoiceId: sale.invoiceId,
      insuranceProvider: sale.insuranceProvider,
      insurancePolicyNumber: sale.insurancePolicyNumber,
      permanentNumberPlate: sale.permanentNumberPlate,
    }));

    return NextResponse.json(formattedSales);
  } catch (error) {
    console.error("Error fetching back office operations:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending operations" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminOrBackOffice();

    const body = await request.json();
    const { saleId, stage, data } = body;

    if (!saleId || !stage) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    let updateData: any = {};

    if (stage === "tr") {
      updateData = {
        trCompleted: true,
        trDate: data.trDate ? new Date(data.trDate) : new Date(),
        trNumber: data.trNumber,
      };
    } else if (stage === "invoice") {
      updateData = {
        invoiceCompleted: true,
        invoiceId: data.invoiceId,
      };
    } else if (stage === "insurance") {
      updateData = {
        insuranceCompleted: true,
        insuranceProvider: data.insuranceProvider,
        insurancePolicyNumber: data.insurancePolicyNumber,
      };
    } else if (stage === "numberPlate") {
      updateData = {
        numberPlateCompleted: true,
        permanentNumberPlate: data.permanentNumberPlate,
      };
    } else {
      return NextResponse.json(
        { error: "Invalid stage" },
        { status: 400 }
      );
    }

    const updatedSale = await prisma.saleReport.update({
      where: { id: saleId },
      data: updateData,
    });

    return NextResponse.json({ success: true, sale: updatedSale });
  } catch (error) {
    console.error("Error updating back office operation:", error);
    return NextResponse.json(
      { error: "Failed to update operation status" },
      { status: 500 }
    );
  }
}
