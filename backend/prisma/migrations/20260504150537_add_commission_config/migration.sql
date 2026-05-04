-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('SIMPLE', 'TIERS', 'PROGRESSIVE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CommissionPeriodicity" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateTable
CREATE TABLE "commission_configs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "calculationType" "CommissionType" NOT NULL DEFAULT 'SIMPLE',
    "periodicity" "CommissionPeriodicity" NOT NULL DEFAULT 'MONTHLY',
    "simpleRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tierConfig" TEXT,
    "progressiveConfig" TEXT,
    "customFormula" TEXT,
    "minThreshold" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "maxCap" DECIMAL(12,3) NOT NULL,
    "includeNewClients" BOOLEAN NOT NULL DEFAULT true,
    "includeRenewals" BOOLEAN NOT NULL DEFAULT true,
    "includeRecurring" BOOLEAN NOT NULL DEFAULT true,
    "paymentDelay" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commission_configs_organizationId_key" ON "commission_configs"("organizationId");

-- CreateIndex
CREATE INDEX "commission_configs_organizationId_idx" ON "commission_configs"("organizationId");

-- AddForeignKey
ALTER TABLE "commission_configs" ADD CONSTRAINT "commission_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
