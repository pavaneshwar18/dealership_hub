import "dotenv/config";
import bcrypt from "bcryptjs";
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

const BRANCHES = [
  { name: "Miryalaguda", city: "Miryalaguda" },
  { name: "Nalgonda", city: "Nalgonda" },
  { name: "Suryapet", city: "Suryapet" },
  { name: "Bhongir", city: "Bhongir" },
  { name: "Kodad", city: "Kodad" },
];

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 10);

  for (const branch of BRANCHES) {
    await prisma.branch.upsert({
      where: { name: branch.name },
      update: {},
      create: branch,
    });
  }

  const branches = await prisma.branch.findMany();

  await prisma.user.upsert({
    where: { email: "admin@bajajdealership.in" },
    update: {},
    create: {
      email: "admin@bajajdealership.in",
      passwordHash,
      name: "Dealership Owner",
      role: "ADMIN",
    },
  });

  for (const branch of branches) {
    const slug = branch.name.toLowerCase();
    await prisma.user.upsert({
      where: { email: `${slug}@bajajdealership.in` },
      update: {},
      create: {
        email: `${slug}@bajajdealership.in`,
        passwordHash,
        name: `${branch.name} Branch Manager`,
        role: "BRANCH_MANAGER",
        branchId: branch.id,
      },
    });
  }

  // Seed mock staff for each branch
  for (const branch of branches) {
    // Clear existing staff so they are re-seeded with realistic base salaries
    await prisma.staff.deleteMany({ where: { branchId: branch.id } });
    await prisma.staff.createMany({
      data: [
      ],
    });
  }

  console.log("Seeded 5 branches, 1 admin, 5 branch managers, and mock branch staff.");
  console.log("Default password for all accounts: changeme123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
