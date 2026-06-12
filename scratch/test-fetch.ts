import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const pendingSales = await prisma.saleReport.findMany({
    where: {
      OR: [
        { trCompleted: false },
        { invoiceCompleted: false },
        { insuranceCompleted: false },
        { numberPlateCompleted: false },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("Success! Found:", pendingSales.length);
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
