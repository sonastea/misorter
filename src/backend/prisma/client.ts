import { Prisma, PrismaClient } from "@prisma/client";
import prismaRandom from "prisma-extension-random";

const basePrisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "stdout",
      level: "error",
    },
  ],
});

basePrisma.$on("query", (e: Prisma.QueryEvent) => {
  console.log("Query: " + e.query + " [Duration: " + e.duration + "ms]");
});

export const prisma = basePrisma.$extends(prismaRandom());
