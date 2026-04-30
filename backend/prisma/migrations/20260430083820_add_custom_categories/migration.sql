-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('EXPENSE', 'REVENUE');

-- CreateTable
CREATE TABLE "custom_categories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_categories_organizationId_type_idx" ON "custom_categories"("organizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "custom_categories_organizationId_name_type_key" ON "custom_categories"("organizationId", "name", "type");

-- AddForeignKey
ALTER TABLE "custom_categories" ADD CONSTRAINT "custom_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
