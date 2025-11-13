import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import prismaRandom from "prisma-extension-random";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("ENV var DATABASE_URL is not set!");
}

const adapter = new PrismaPg(connectionString);

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
