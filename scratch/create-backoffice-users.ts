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

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 10);

  const users = [
    {
      email: "backoffice1@bajajdealership.in",
      name: "Back Office User 1",
      role: "BACK_OFFICE" as const,
    },
    {
      email: "backoffice2@bajajdealership.in",
      name: "Back Office User 2",
      role: "BACK_OFFICE" as const,
    },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
      },
      create: {
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
      },
    });
    console.log(`Successfully created/updated user: ${user.name} (${user.email})`);
  }
}

main()
  .catch((error) => {
    console.error("Error creating users:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
