-- AlterTable
ALTER TABLE "affaires" ADD COLUMN     "productId" TEXT;

-- CreateIndex
CREATE INDEX "affaires_productId_idx" ON "affaires"("productId");

-- AddForeignKey
ALTER TABLE "affaires" ADD CONSTRAINT "affaires_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
