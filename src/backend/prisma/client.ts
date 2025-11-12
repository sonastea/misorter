import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import prismaRandom from "prisma-extension-random";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("ENV var DATABASE_URL is not set!");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const basePrisma = new PrismaClient({
  adapter,
  log: [
    {
      emit: "stdout",
      level: "error",
    },
  ],
});

export const prisma = basePrisma.$extends(prismaRandom());
