import { prisma } from "@db/client";
import * as trpc from "@trpc/server";
import { customAlphabet } from "nanoid";
import { z } from "zod";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  16
);

export const listingRouter = trpc
  .router()
  .query("get", {
    input: z.object({
      label: z.string(),
    }),
    async resolve({ input }) {
      const list = await prisma.listing.findUnique({
        where: { label: input.label },
        select: {
          label: true,
          items: {
            select: {
              value: true,
            },
          },
        },
      });

      return list;
    },
  })
  .mutation("create", {
    input: z.object({
      items: z.array(
        z.object({
          value: z.string(),
        })
      ),
    }),
    async resolve({ input }) {
      const newLabel = nanoid();
      const list = await prisma.listing.create({
        data: {
          label: newLabel,
          items: {
            create: input.items,
          },
        },
        select: {
          label: true,
          items: true,
        },
      });

      return list;
    },
  });
