-- Migration: Update Prize Schema to Support Physical and Cash Prizes
-- This migration updates the database schema to handle both physical prizes and cash prizes

-- Step 1: Add new enum type
CREATE TYPE "PrizeType" AS ENUM ('CASH', 'PHYSICAL', 'EXPERIENCE');

-- Step 2: Add new columns to PrizeDistribution table
ALTER TABLE "PrizeDistribution" 
ADD COLUMN "prizeType" "PrizeType" NOT NULL DEFAULT 'PHYSICAL',
ADD COLUMN "description" TEXT;

-- Step 3: Update existing prizeAmount from Float to String (temporary approach)
-- Note: This is a complex migration. In production, you might need to:
-- 1. Create a new column prizeAmountString
-- 2. Copy data from prizeAmount to prizeAmountString
-- 3. Drop old prizeAmount
-- 4. Rename prizeAmountString to prizeAmount

-- For now, we'll add the new column and migrate data
ALTER TABLE "PrizeDistribution" 
ADD COLUMN "prizeAmountString" TEXT;

-- Migrate existing numeric amounts to string format
UPDATE "PrizeDistribution" 
SET "prizeAmountString" = prizeAmount::TEXT;

-- Step 4: Add new columns to Winner table
ALTER TABLE "Winner" 
ADD COLUMN "prizeType" "PrizeType" NOT NULL DEFAULT 'PHYSICAL',
ADD COLUMN "description" TEXT,
ADD COLUMN "prizeAmountString" TEXT;

-- Migrate existing winner prize amounts
UPDATE "Winner" 
SET "prizeAmountString" = prizeAmount::TEXT;

-- Step 5: Create indexes for better performance
CREATE INDEX "idx_PrizeDistribution_prizeType" ON "PrizeDistribution"("prizeType");
CREATE INDEX "idx_Winner_prizeType" ON "Winner"("prizeType");

-- Step 6: Add comments for documentation
COMMENT ON TYPE "PrizeType" IS 'Type of prize: CASH for money, PHYSICAL for items, EXPERIENCE for services/events';
COMMENT ON COLUMN "PrizeDistribution"."prizeType" IS 'Type of prize being offered';
COMMENT ON COLUMN "PrizeDistribution"."prizeAmountString" IS 'Prize amount or item description (e.g., "Toyota Yaris" or "ETB 50,000")';
COMMENT ON COLUMN "PrizeDistribution"."description" IS 'Detailed description of the prize';
COMMENT ON COLUMN "Winner"."prizeType" IS 'Type of prize won by the winner';
COMMENT ON COLUMN "Winner"."prizeAmountString" IS 'Prize amount or item won (e.g., "Toyota Yaris" or "ETB 50,000")';
COMMENT ON COLUMN "Winner"."description" IS 'Detailed description of the prize won';

-- Note: After this migration, you'll need to:
-- 1. Update your application code to use the new string-based prize amounts
-- 2. Eventually drop the old prizeAmount columns (after thorough testing)
-- 3. Update Prisma schema to match these changes
