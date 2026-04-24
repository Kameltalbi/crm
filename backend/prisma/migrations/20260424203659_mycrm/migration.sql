-- CreateEnum
CREATE TYPE "AffaireType" AS ENUM ('BILAN_CARBONE', 'FORMATION');

-- CreateEnum
CREATE TYPE "StatutAffaire" AS ENUM ('PROSPECTION', 'PIPELINE', 'REALISE', 'PERDU');

-- CreateEnum
CREATE TYPE "ActiviteType" AS ENUM ('NOTE', 'APPEL', 'EMAIL_ENVOYE', 'EMAIL_RECU', 'RDV', 'CHANGEMENT_STATUT', 'DEVIS_CREE', 'FACTURE_CREEE', 'AUTRE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "matricule" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affaires" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "AffaireType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "montantHT" DECIMAL(12,3) NOT NULL,
    "statut" "StatutAffaire" NOT NULL DEFAULT 'PROSPECTION',
    "probabilite" INTEGER NOT NULL DEFAULT 50,
    "moisPrevu" INTEGER NOT NULL,
    "anneePrevue" INTEGER NOT NULL,
    "dateClotureReelle" TIMESTAMP(3),
    "viaPartenaire" BOOLEAN NOT NULL DEFAULT false,
    "tauxCommission" DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    "devisId" TEXT,
    "devisNumero" TEXT,
    "devisPdfUrl" TEXT,
    "factureId" TEXT,
    "factureNumero" TEXT,
    "facturePdfUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "affaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activites" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT NOT NULL,
    "type" "ActiviteType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "affaireId" TEXT,
    "messageId" TEXT,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmail_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prevision_mois" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "nbBilansPrevu" INTEGER NOT NULL DEFAULT 0,
    "prixMoyenBilan" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "joursFormation" INTEGER NOT NULL DEFAULT 0,
    "tarifJourFormation" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "estEte" BOOLEAN NOT NULL DEFAULT false,
    "tauxPartenaire" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prevision_mois_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "affaires_statut_anneePrevue_idx" ON "affaires"("statut", "anneePrevue");

-- CreateIndex
CREATE INDEX "affaires_clientId_idx" ON "affaires"("clientId");

-- CreateIndex
CREATE INDEX "activites_affaireId_createdAt_idx" ON "activites"("affaireId", "createdAt");

-- CreateIndex
CREATE INDEX "emails_affaireId_idx" ON "emails"("affaireId");

-- CreateIndex
CREATE UNIQUE INDEX "gmail_tokens_userId_key" ON "gmail_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "prevision_mois_annee_mois_key" ON "prevision_mois"("annee", "mois");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affaires" ADD CONSTRAINT "affaires_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affaires" ADD CONSTRAINT "affaires_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites" ADD CONSTRAINT "activites_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "affaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "affaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gmail_tokens" ADD CONSTRAINT "gmail_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
