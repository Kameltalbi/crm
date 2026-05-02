-- AlterTable
ALTER TABLE "affaires" ADD COLUMN     "dateProchaineAction" TIMESTAMP(3),
ADD COLUMN     "prochaineAction" TEXT,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;
