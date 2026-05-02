/*
  Warnings:

  - The values [PROSPECTION,PIPELINE,REALISE] on the enum `StatutAffaire` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
-- Migrate existing data to new enum values
ALTER TABLE "affaires" ALTER COLUMN "statut" TYPE TEXT USING ("statut"::text);
UPDATE "affaires" SET "statut" = 'PROSPECT' WHERE "statut" = 'PROSPECTION';
UPDATE "affaires" SET "statut" = 'QUALIFIE' WHERE "statut" = 'PIPELINE';
UPDATE "affaires" SET "statut" = 'GAGNE' WHERE "statut" = 'REALISE';
-- PERDU stays the same

CREATE TYPE "StatutAffaire_new" AS ENUM ('PROSPECT', 'QUALIFIE', 'PROPOSITION', 'NEGOCIATION', 'GAGNE', 'PERDU');
ALTER TABLE "affaires" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "affaires" ALTER COLUMN "statut" TYPE "StatutAffaire_new" USING ("statut"::text::"StatutAffaire_new");
ALTER TYPE "StatutAffaire" RENAME TO "StatutAffaire_old";
ALTER TYPE "StatutAffaire_new" RENAME TO "StatutAffaire";
DROP TYPE "StatutAffaire_old";
ALTER TABLE "affaires" ALTER COLUMN "statut" SET DEFAULT 'PROSPECT';
COMMIT;

-- AlterTable
ALTER TABLE "affaires" ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "statut" SET DEFAULT 'PROSPECT';

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_logs" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_templates_organizationId_idx" ON "email_templates"("organizationId");

-- CreateIndex
CREATE INDEX "backup_logs_status_idx" ON "backup_logs"("status");

-- CreateIndex
CREATE INDEX "backup_logs_createdAt_idx" ON "backup_logs"("createdAt");

-- CreateIndex
CREATE INDEX "subscriptions_organizationId_idx" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "subscriptions_paymentStatus_idx" ON "subscriptions"("paymentStatus");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
