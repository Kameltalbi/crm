-- AlterTable
ALTER TABLE "affaires" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "sales_objectives" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "targetAmount" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_objectives_organizationId_idx" ON "sales_objectives"("organizationId");

-- CreateIndex
CREATE INDEX "sales_objectives_userId_idx" ON "sales_objectives"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_objectives_organizationId_userId_year_month_key" ON "sales_objectives"("organizationId", "userId", "year", "month");

-- CreateIndex
CREATE INDEX "affaires_assignedToId_idx" ON "affaires"("assignedToId");

-- AddForeignKey
ALTER TABLE "affaires" ADD CONSTRAINT "affaires_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_objectives" ADD CONSTRAINT "sales_objectives_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_objectives" ADD CONSTRAINT "sales_objectives_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
