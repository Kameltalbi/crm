/*
  Warnings:

  - The `category` column on the `expenses` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "expenses" DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'Autre';

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");
