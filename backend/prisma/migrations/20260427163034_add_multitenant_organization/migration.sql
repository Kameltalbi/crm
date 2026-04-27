/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,annee,mois]` on the table `prevision_mois` will be added. If there are existing duplicate values, this will fail.
*/

-- DropIndex
DROP INDEX "prevision_mois_annee_mois_key";

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Create default organization
INSERT INTO "organizations" ("id", "name", "email", "phone", "address", "createdAt", "updatedAt")
VALUES ('default-org-id', 'Bilan Tunisie', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: Add organizationId as nullable first
ALTER TABLE "activites" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "affaires" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "clients" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "emails" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "gmail_tokens" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "prevision_mois" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "products" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "users" ADD COLUMN "organizationId" TEXT;

-- Update existing rows to use default organization
UPDATE "activites" SET "organizationId" = 'default-org-id' WHERE "organizationId" IS NULL;
UPDATE "affaires" SET "organizationId" = 'default-org-id' WHERE "organizationId" IS NULL;
UPDATE "clients" SET "organizationId" = 'default-org-id' WHERE "organizationId" IS NULL;
UPDATE "emails" SET "organizationId" = 'default-org-id' WHERE "organizationId" IS NULL;
UPDATE "gmail_tokens" SET "organizationId" = 'default-org-id' WHERE "organizationId" IS NULL;
UPDATE "prevision_mois" SET "organizationId" = 'default-org-id' WHERE "organizationId" IS NULL;
UPDATE "products" SET "organizationId" = 'default-org-id' WHERE "organizationId" IS NULL;
UPDATE "users" SET "organizationId" = 'default-org-id' WHERE "organizationId" IS NULL;

-- AlterTable: Make organizationId NOT NULL
ALTER TABLE "activites" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "affaires" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "emails" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "gmail_tokens" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "prevision_mois" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "activites_organizationId_idx" ON "activites"("organizationId");

-- CreateIndex
CREATE INDEX "affaires_organizationId_idx" ON "affaires"("organizationId");

-- CreateIndex
CREATE INDEX "clients_organizationId_idx" ON "clients"("organizationId");

-- CreateIndex
CREATE INDEX "emails_organizationId_idx" ON "emails"("organizationId");

-- CreateIndex
CREATE INDEX "gmail_tokens_organizationId_idx" ON "gmail_tokens"("organizationId");

-- CreateIndex
CREATE INDEX "prevision_mois_organizationId_idx" ON "prevision_mois"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "prevision_mois_organizationId_annee_mois_key" ON "prevision_mois"("organizationId", "annee", "mois");

-- CreateIndex
CREATE INDEX "products_organizationId_idx" ON "products"("organizationId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affaires" ADD CONSTRAINT "affaires_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites" ADD CONSTRAINT "activites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gmail_tokens" ADD CONSTRAINT "gmail_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prevision_mois" ADD CONSTRAINT "prevision_mois_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
