-- Safe migration: convert AffaireType enum to TEXT without data loss
-- Step 1: Convert column from enum to text (preserves existing values like BILAN_CARBONE, FORMATION)
ALTER TABLE "affaires" ALTER COLUMN "type" SET DEFAULT 'Autre';
ALTER TABLE "affaires" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- Step 2: Add expense recurrence fields if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='isRecurrent') THEN
    ALTER TABLE "expenses" ADD COLUMN "isRecurrent" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='recurrenceMonths') THEN
    ALTER TABLE "expenses" ADD COLUMN "recurrenceMonths" TEXT;
  END IF;
END $$;

-- Step 3: Drop the enum type
DROP TYPE IF EXISTS "AffaireType";
