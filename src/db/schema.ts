import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { defineRelations } from "drizzle-orm";

export const noticeTypes = ["info", "warning", "error", "success"] as const;
export type NoticeType = (typeof noticeTypes)[number];
export const noticeTypeEnum = pgEnum("notice_type", noticeTypes);

export const supportSubmissionTypes = ["help", "feedback"] as const;
export type SupportSubmissionType = (typeof supportSubmissionTypes)[number];
export const supportSubmissionTypeEnum = pgEnum(
  "support_submission_type",
  supportSubmissionTypes
);

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

export const supportSubmissions = pgTable("SupportSubmission", {
  id: serial("id").primaryKey(),
  type: supportSubmissionTypeEnum("type").notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  message: text("message").notNull(),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const activityLogActions = [
  "listing_delete",
  "listing_delete_many",
  "listing_create",
  "listing_update",
] as const;
export type ActivityLogAction = (typeof activityLogActions)[number];
export const activityLogActionEnum = pgEnum(
  "activity_log_action",
  activityLogActions
);

export const activityLogs = pgTable(
  "ActivityLog",
  {
    id: serial("id").primaryKey(),
    action: activityLogActionEnum("action").notNull(),
    targetLabel: varchar("targetLabel", { length: 16 }),
    targetCount: integer("targetCount").default(1).notNull(),
    details: text("details"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("ActivityLog_createdAt_idx").on(table.createdAt)]
);

export const relations = defineRelations(
  { listings, items, visits, notices, supportSubmissions, activityLogs },
  (r) => ({
    listings: {
      items: r.many.items({
        from: r.listings.label,
        to: r.items.listingLabel,
      }),
      visits: r.many.visits({
        from: r.listings.label,
        to: r.visits.listingLabel,
      }),
    },
    items: {
      listing: r.one.listings({
        from: r.items.listingLabel,
        to: r.listings.label,
      }),
    },
    visits: {
      listing: r.one.listings({
        from: r.visits.listingLabel,
        to: r.listings.label,
      }),
    },
  })
);
