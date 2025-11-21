import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const noticeTypes = ["info", "warning", "error", "success"] as const;
export type NoticeType = (typeof noticeTypes)[number];
export const noticeTypeEnum = pgEnum("notice_type", noticeTypes);

export const listings = pgTable("Listing", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 16 }).unique().notNull(),
  title: varchar("title", { length: 255 }).default("misorter").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const items = pgTable(
  "Item",
  {
    id: serial("id").primaryKey(),
    value: text("value").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    listingLabel: varchar("listingLabel", { length: 255 }).notNull(),
  },
  (table) => [index("Item_listingLabel_idx").on(table.listingLabel)]
);

export const visits = pgTable(
  "Visit",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    listingLabel: varchar("listingLabel", { length: 255 }).notNull(),
    source: varchar("source", { length: 255 }),
  },
  (table) => [index("Visit_listingLabel_idx").on(table.listingLabel)]
);

export const notices = pgTable("Notice", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  type: noticeTypeEnum("type").default("info").notNull(),
  isActive: timestamp("isActive", { mode: "date" }),
  expiresAt: timestamp("expiresAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// Relations
export const listingsRelations = relations(listings, ({ many }) => ({
  items: many(items),
  visits: many(visits),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  listing: one(listings, {
    fields: [items.listingLabel],
    references: [listings.label],
  }),
}));

export const visitsRelations = relations(visits, ({ one }) => ({
  listing: one(listings, {
    fields: [visits.listingLabel],
    references: [listings.label],
  }),
}));
