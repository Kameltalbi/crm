-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING';
