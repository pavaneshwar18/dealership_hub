import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // 1. Enforce authentication (Admin only)
    await requireAdmin();

    const body = await request.json();
    const { vehicles, branchId } = body;

    // 2. Validate input
    if (!branchId) {
      return NextResponse.json({ error: "Branch ID is required." }, { status: 400 });
    }

    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json({ error: "Vehicles list must be a non-empty array." }, { status: 400 });
    }

    // Check if target branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      return NextResponse.json({ error: "Target branch not found." }, { status: 400 });
    }

    // 3. Check for duplicates in the request itself
    const chassisSet = new Set<string>();
    const engineSet = new Set<string>();
    for (const v of vehicles) {
      if (!v.chassisNumber || !v.engineNumber || !v.modelName) {
        return NextResponse.json(
          { error: "Each vehicle must have a chassis number, engine number, and model name." },
          { status: 400 }
        );
      }
      
      const chassis = v.chassisNumber.toUpperCase().trim();
      const engine = v.engineNumber.toUpperCase().trim();

      if (chassisSet.has(chassis)) {
        return NextResponse.json({ error: `Chassis number '${chassis}' is listed multiple times in the upload.` }, { status: 400 });
      }
      if (engineSet.has(engine)) {
        return NextResponse.json({ error: `Engine number '${engine}' is listed multiple times in the upload.` }, { status: 400 });
      }

      chassisSet.add(chassis);
      engineSet.add(engine);
    }

    // 4. Check database for existing duplicates
    const allChassis = Array.from(chassisSet);
    const allEngines = Array.from(engineSet);

    const existingChassis = await prisma.vehicleStock.findMany({
      where: { chassisNumber: { in: allChassis } },
      select: { chassisNumber: true },
    });
    if (existingChassis.length > 0) {
      return NextResponse.json(
        { error: `Vehicle with Chassis Number '${existingChassis[0].chassisNumber}' already exists in the inventory.` },
        { status: 400 }
      );
    }

    const existingEngines = await prisma.vehicleStock.findMany({
      where: { engineNumber: { in: allEngines } },
      select: { engineNumber: true },
    });
    if (existingEngines.length > 0) {
      return NextResponse.json(
        { error: `Vehicle with Engine Number '${existingEngines[0].engineNumber}' already exists in the inventory.` },
        { status: 400 }
      );
    }

    // 5. Fetch all price configs to assign default values
    const priceConfigs = await prisma.vehiclePriceConfig.findMany();

    // Helper to resolve price config amounts
    const getPrices = (modelName: string, variant: string | null) => {
      // Find config matching variant specifically
      let config = priceConfigs.find(
        (c) => c.modelName.toLowerCase().trim() === modelName.toLowerCase().trim() && 
               (c.modelVariant || "").toLowerCase().trim() === (variant || "").toLowerCase().trim()
      );
      
      // Fallback: match model with standard empty variant
      if (!config && variant) {
        config = priceConfigs.find(
          (c) => c.modelName.toLowerCase().trim() === modelName.toLowerCase().trim() && 
                 c.modelVariant === ""
        );
      }

      return {
        invoiceAmount: config ? config.invoiceAmount : 0,
        mrpAmount: config ? config.mrpAmount : 0,
      };
    };

    // 6. Create entries inside a Prisma transaction
    const createdItems = await prisma.$transaction(
      vehicles.map((v) => {
        const variant = v.modelVariant ? String(v.modelVariant).trim() : null;
        const prices = getPrices(v.modelName, variant);

        return prisma.vehicleStock.create({
          data: {
            chassisNumber: v.chassisNumber.toUpperCase().trim(),
            engineNumber: v.engineNumber.toUpperCase().trim(),
            modelName: v.modelName.trim(),
            modelVariant: variant,
            invoiceBillAmount: prices.invoiceAmount,
            mrpAmount: prices.mrpAmount,
            branchId: branch.id,
            receivedDate: new Date(),
            status: "AVAILABLE",
          },
        });
      })
    );

    return NextResponse.json({ success: true, count: createdItems.length, items: createdItems });
  } catch (error: any) {
    console.error("Bulk Registration Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register vehicles in bulk." },
      { status: 500 }
    );
  }
}
