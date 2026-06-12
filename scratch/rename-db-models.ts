import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const MAPPINGS = [
  { oldName: "Compact", newName: "Compact Diesel" },
  { oldName: "Maxima Z", newName: "Maxima Z Diesel" },
  { oldName: "Maxima WB", newName: "Maxima WB Diesel" },
  { oldName: "Cargo", newName: "Cargo Diesel" }
];

async function main() {
  console.log("Starting model renaming in DB...");

  for (const { oldName, newName } of MAPPINGS) {
    // 1. Update VehicleStock
    const stockRes = await prisma.vehicleStock.updateMany({
      where: { modelName: oldName },
      data: { modelName: newName }
    });
    if (stockRes.count > 0) {
      console.log(`Updated ${stockRes.count} stock items from '${oldName}' to '${newName}'`);
    }

    // 2. Update SaleReport
    const saleRes = await prisma.saleReport.updateMany({
      where: { modelName: oldName },
      data: { modelName: newName }
    });
    if (saleRes.count > 0) {
      console.log(`Updated ${saleRes.count} sales reports from '${oldName}' to '${newName}'`);
    }

    // 3. Update ExchangeVehicle
    const exchangeRes = await prisma.exchangeVehicle.updateMany({
      where: { modelName: oldName },
      data: { modelName: newName }
    });
    if (exchangeRes.count > 0) {
      console.log(`Updated ${exchangeRes.count} exchange vehicles from '${oldName}' to '${newName}'`);
    }

    // 4. Update VehiclePriceConfig
    const priceRes = await prisma.vehiclePriceConfig.updateMany({
      where: { modelName: oldName },
      data: { modelName: newName }
    });
    if (priceRes.count > 0) {
      console.log(`Updated ${priceRes.count} pricing configs from '${oldName}' to '${newName}'`);
    }
  }

  // 5. Consolidate existing color variant prices to base configuration
  console.log("Consolidating color variant prices...");
  const colorModels = ["Maxima Z (CNG)", "Maxima WB (CNG)", "Cargo CNG"];
  for (const mName of colorModels) {
    const existingConfigs = await prisma.vehiclePriceConfig.findMany({
      where: {
        modelName: mName,
        modelVariant: { in: ["G.Yellow", "E.Green"] }
      }
    });

    if (existingConfigs.length > 0) {
      const baseConfig = existingConfigs.find(c => c.invoiceAmount > 0 || c.mrpAmount > 0) || existingConfigs[0];
      
      // Check if a parent config already exists
      const parentConfig = await prisma.vehiclePriceConfig.findUnique({
        where: {
          modelName_modelVariant: {
            modelName: mName,
            modelVariant: ""
          }
        }
      });

      if (!parentConfig) {
        await prisma.vehiclePriceConfig.create({
          data: {
            modelName: mName,
            modelVariant: "",
            invoiceAmount: baseConfig.invoiceAmount,
            mrpAmount: baseConfig.mrpAmount
          }
        });
        console.log(`Created consolidated price config for '${mName}' using values from variant '${baseConfig.modelVariant}' (Invoice: ₹${baseConfig.invoiceAmount}, MRP: ₹${baseConfig.mrpAmount})`);
      }
    }
  }

  console.log("DB update completed successfully.");
}

main()
  .catch(console.error)
  .finally(() => pool.end());
