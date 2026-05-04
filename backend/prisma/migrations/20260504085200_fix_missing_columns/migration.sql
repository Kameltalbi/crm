-- Add assignedToId column to affaires table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'affaires' AND column_name = 'assignedToId'
    ) THEN
        ALTER TABLE "affaires" ADD COLUMN "assignedToId" TEXT;
        CREATE INDEX "affaires_assignedToId_idx" ON "affaires"("assignedToId");
    END IF;
END $$;

-- Create sales_objectives table if it doesn't exist
CREATE TABLE IF NOT EXISTS "sales_objectives" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "targetAmount" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_objectives_pkey" PRIMARY KEY ("id")
);

-- Create user_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "user_permissions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sales_objectives_organizationId_userId_year_month_key'
    ) THEN
        ALTER TABLE "sales_objectives" ADD CONSTRAINT "sales_objectives_organizationId_userId_year_month_key" UNIQUE ("organizationId", "userId", "year", "month");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_permissions_organizationId_userId_page_key'
    ) THEN
        ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_organizationId_userId_page_key" UNIQUE ("organizationId", "userId", "page");
    END IF;
END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS "sales_objectives_organizationId_idx" ON "sales_objectives"("organizationId");
CREATE INDEX IF NOT EXISTS "sales_objectives_userId_idx" ON "sales_objectives"("userId");
CREATE INDEX IF NOT EXISTS "user_permissions_organizationId_idx" ON "user_permissions"("organizationId");
CREATE INDEX IF NOT EXISTS "user_permissions_userId_idx" ON "user_permissions"("userId");

-- Add foreign keys if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'affaires_assignedToId_fkey'
    ) THEN
        ALTER TABLE "affaires" ADD CONSTRAINT "affaires_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sales_objectives_organizationId_fkey'
    ) THEN
        ALTER TABLE "sales_objectives" ADD CONSTRAINT "sales_objectives_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sales_objectives_userId_fkey'
    ) THEN
        ALTER TABLE "sales_objectives" ADD CONSTRAINT "sales_objectives_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_permissions_organizationId_fkey'
    ) THEN
        ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_permissions_userId_fkey'
    ) THEN
        ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
