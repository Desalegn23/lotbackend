-- Migration: Update Prize Schema to Support Physical and Cash Prizes
-- This migration updates database schema to handle both physical prizes and cash prizes
-- SAFELY handles existing data without data loss

-- Step 1: Add new enum type
DO $$ BEGIN
CREATE TYPE IF NOT EXISTS "PrizeType" AS ENUM ('CASH', 'PHYSICAL', 'EXPERIENCE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add new columns to PrizeDistribution table with safe defaults
DO $$ BEGIN
    -- Add prizeType column with default for existing rows
    ALTER TABLE "PrizeDistribution" 
    ADD COLUMN IF NOT EXISTS "prizeType" "PrizeType" DEFAULT 'PHYSICAL';
    
    -- Add description column (nullable)
    ALTER TABLE "PrizeDistribution" 
    ADD COLUMN IF NOT EXISTS "description" TEXT;
    
    -- Add temporary string column for amounts
    ALTER TABLE "PrizeDistribution" 
    ADD COLUMN IF NOT EXISTS "prizeAmountString" TEXT;
    
    -- Migrate existing numeric amounts to string format
    UPDATE "PrizeDistribution" 
    SET "prizeAmountString" = COALESCE(prizeAmount::TEXT, '');
    
    -- If prizeAmountString is empty, set a default based on existing amount
    UPDATE "PrizeDistribution" 
    SET "prizeAmountString" = CASE 
        WHEN COALESCE(prizeAmount::TEXT, '') = '' THEN 'ETB 0'
        ELSE prizeAmount::TEXT 
    END
    WHERE "prizeAmountString" = '' OR "prizeAmountString" IS NULL;
    
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Step 3: Add new columns to Winner table with safe defaults
DO $$ BEGIN
    -- Add prizeType column with default for existing rows
    ALTER TABLE "Winner" 
    ADD COLUMN IF NOT EXISTS "prizeType" "PrizeType" DEFAULT 'PHYSICAL';
    
    -- Add description column (nullable)
    ALTER TABLE "Winner" 
    ADD COLUMN IF NOT EXISTS "description" TEXT;
    
    -- Add temporary string column for amounts
    ALTER TABLE "Winner" 
    ADD COLUMN IF NOT EXISTS "prizeAmountString" TEXT;
    
    -- Migrate existing winner prize amounts
    UPDATE "Winner" 
    SET "prizeAmountString" = COALESCE(prizeAmount::TEXT, '');
    
    -- If prizeAmountString is empty, set a default
    UPDATE "Winner" 
    SET "prizeAmountString" = CASE 
        WHEN COALESCE(prizeAmount::TEXT, '') = '' THEN 'ETB 0'
        ELSE prizeAmount::TEXT 
    END
    WHERE "prizeAmountString" = '' OR "prizeAmountString" IS NULL;
    
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Step 4: Create indexes for better performance
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS "idx_PrizeDistribution_prizeType" ON "PrizeDistribution"("prizeType");
    CREATE INDEX IF NOT EXISTS "idx_Winner_prizeType" ON "Winner"("prizeType");
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 5: Add comments for documentation
DO $$ BEGIN
    COMMENT ON TYPE "PrizeType" IS 'Type of prize: CASH for money, PHYSICAL for items, EXPERIENCE for services/events';
    
    COMMENT ON COLUMN "PrizeDistribution"."prizeType" IS 'Type of prize being offered';
    COMMENT ON COLUMN "PrizeDistribution"."prizeAmountString" IS 'Prize amount or item description (e.g., "Toyota Yaris" or "ETB 50,000")';
    COMMENT ON COLUMN "PrizeDistribution"."description" IS 'Detailed description of prize';
    
    COMMENT ON COLUMN "Winner"."prizeType" IS 'Type of prize won by winner';
    COMMENT ON COLUMN "Winner"."prizeAmountString" IS 'Prize amount or item won (e.g., "Toyota Yaris" or "ETB 50,000")';
    COMMENT ON COLUMN "Winner"."description" IS 'Detailed description of prize won';
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Step 6: Verify data migration
SELECT 
    'PrizeDistribution' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN "prizeType" IS NOT NULL THEN 1 END) as rows_with_prize_type,
    COUNT(CASE WHEN "prizeAmountString" IS NOT NULL THEN 1 END) as rows_with_string_amount
FROM "PrizeDistribution"
UNION ALL
SELECT 
    'Winner' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN "prizeType" IS NOT NULL THEN 1 END) as rows_with_prize_type,
    COUNT(CASE WHEN "prizeAmountString" IS NOT NULL THEN 1 END) as rows_with_string_amount
FROM "Winner";

-- Migration completed successfully!
-- Note: After this migration, you should:
-- 1. Update your application code to use the new string-based prize amounts
-- 2. Test thoroughly before dropping the old numeric columns
-- 3. Consider running: ALTER TABLE "PrizeDistribution" DROP COLUMN "prizeAmount";
-- 4. Consider running: ALTER TABLE "Winner" DROP COLUMN "prizeAmount";
-- 5. Rename string columns to original names if desired
