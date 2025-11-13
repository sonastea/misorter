CREATE TABLE "Item" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"listingLabel" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Listing" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(16) NOT NULL,
	"title" varchar(255) DEFAULT 'misorter' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Listing_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "Visit" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"listingLabel" varchar(255) NOT NULL,
	"source" varchar(255)
);
--> statement-breakpoint
CREATE INDEX "Item_listingLabel_idx" ON "Item" USING btree ("listingLabel");--> statement-breakpoint
CREATE INDEX "Visit_listingLabel_idx" ON "Visit" USING btree ("listingLabel");