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
  { oldName: "Compact Diesel", newName: "RE Diesel" },
  { oldName: "Compact", newName: "RE Diesel" },
  { oldName: "4S LPG", newName: "RE LPG" },
];

async function main() {
  console.log("Starting model renaming in DB...");

  for (const { oldName, newName } of MAPPINGS) {
    try {
      const stockRes = await prisma.vehicleStock.updateMany({
        where: { modelName: oldName },
        data: { modelName: newName }
      });
      if (stockRes.count > 0) console.log(`Updated ${stockRes.count} stock items from '${oldName}' to '${newName}'`);
      
      const saleRes = await prisma.saleReport.updateMany({
        where: { modelName: oldName },
        data: { modelName: newName }
      });
      if (saleRes.count > 0) console.log(`Updated ${saleRes.count} sales reports from '${oldName}' to '${newName}'`);

      const exchangeRes = await prisma.exchangeVehicle.updateMany({
        where: { modelName: oldName },
        data: { modelName: newName }
      });
      if (exchangeRes.count > 0) console.log(`Updated ${exchangeRes.count} exchange vehicles from '${oldName}' to '${newName}'`);

      // VehiclePriceConfig
      // Since changing name might hit unique constraint if new name exists, we should be careful.
      // E.g. RE Diesel might not exist yet.
      const priceRes = await prisma.vehiclePriceConfig.updateMany({
        where: { modelName: oldName },
        data: { modelName: newName }
      });
      if (priceRes.count > 0) console.log(`Updated ${priceRes.count} pricing configs from '${oldName}' to '${newName}'`);
    } catch (e: any) {
      console.log(`Skipped or error on ${oldName} to ${newName}: ${e.message}`);
    }
  }

  console.log("DB update completed successfully.");
}

main()
  .catch(console.error)
  .finally(() => pool.end());
