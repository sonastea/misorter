-- CreateTable
CREATE TABLE "Listing" (
    "id" SERIAL NOT NULL,
    "label" CHAR(16) NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'misorter',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingLabel" TEXT NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingLabel" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_label_key" ON "Listing"("label");

-- CreateIndex
CREATE INDEX "Item_listingLabel_idx" ON "Item"("listingLabel");

-- CreateIndex
CREATE INDEX "Visit_listingLabel_idx" ON "Visit"("listingLabel");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_listingLabel_fkey" FOREIGN KEY ("listingLabel") REFERENCES "Listing"("label") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_listingLabel_fkey" FOREIGN KEY ("listingLabel") REFERENCES "Listing"("label") ON DELETE CASCADE ON UPDATE CASCADE;
