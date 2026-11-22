-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('PRODUIT', 'ACCESSOIRE', 'CARTE_CADEAU');

-- CreateEnum
CREATE TYPE "ProductTag" AS ENUM ('NOUVEAUTE', 'BEST_SELLER');

-- CreateEnum
CREATE TYPE "ExceptionKind" AS ENUM ('EXCEPTIONNEL', 'ANNULE');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL DEFAULT 'PRODUIT',
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL,
    "appellation" TEXT NOT NULL DEFAULT '',
    "grapes" TEXT NOT NULL DEFAULT '',
    "vintage" TEXT NOT NULL DEFAULT '',
    "volumeCl" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL,
    "noAddedSulfites" BOOLEAN NOT NULL DEFAULT false,
    "sugar" TEXT,
    "style" TEXT,
    "isBeer" BOOLEAN NOT NULL DEFAULT false,
    "bottleLabel" TEXT,
    "boxKind" TEXT,
    "tag" "ProductTag",
    "discountEligible" BOOLEAN NOT NULL DEFAULT true,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "place" TEXT NOT NULL,
    "hours" TEXT NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketException" (
    "id" TEXT NOT NULL,
    "kind" "ExceptionKind" NOT NULL,
    "date" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "place" TEXT NOT NULL DEFAULT '',
    "hours" TEXT NOT NULL DEFAULT '',
    "note" TEXT,
    "lon" DOUBLE PRECISION,
    "lat" DOUBLE PRECISION,
    "marketId" TEXT,

    CONSTRAINT "MarketException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT,
    "guests" INTEGER,
    "place" TEXT,
    "budget" TEXT,
    "message" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'nouvelle',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_hidden_sortOrder_idx" ON "Product"("hidden", "sortOrder");

-- CreateIndex
CREATE INDEX "MarketException_date_idx" ON "MarketException"("date");

-- AddForeignKey
ALTER TABLE "MarketException" ADD CONSTRAINT "MarketException_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
