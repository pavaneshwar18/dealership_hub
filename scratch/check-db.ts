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

async function main() {
  const stockModels = await prisma.vehicleStock.findMany({
    select: { modelName: true },
    distinct: ['modelName']
  });

  const saleModels = await prisma.saleReport.findMany({
    select: { modelName: true },
    distinct: ['modelName']
  });

  const priceConfigs = await prisma.vehiclePriceConfig.findMany({
    select: { modelName: true },
    distinct: ['modelName']
  });

  console.log("Unique models in VehicleStock:", stockModels.map(m => m.modelName));
  console.log("Unique models in SaleReport:", saleModels.map(m => m.modelName));
  console.log("Unique models in VehiclePriceConfig:", priceConfigs.map(m => m.modelName));
}

main()
  .catch(console.error)
  .finally(() => pool.end());
