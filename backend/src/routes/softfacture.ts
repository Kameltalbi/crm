import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth from '../middleware/auth.js';
import { softfactureClient } from '../services/softfacture.js';

export const softfactureRoutes = Router();
softfactureRoutes.use(auth);

// ─── Créer un DEVIS dans Softfacture à partir d'une affaire ─────
softfactureRoutes.post('/devis/:affaireId', async (req, res, next) => {
  try {
    const affaire = await prisma.affaire.findUnique({
      where: { id: req.params.affaireId },
      include: { client: true },
    });
    if (!affaire) return res.status(404).json({ error: 'Affaire introuvable' });
    if (affaire.devisId) {
      return res.status(400).json({ error: 'Devis déjà créé', devisId: affaire.devisId });
    }

    const result = await softfactureClient.creerDevis({
      clientNom:    affaire.client.name,
      clientEmail:  affaire.client.email,
      clientMatricule: affaire.client.matricule,
      designation:  affaire.title || '',
      montantHT:    Number(affaire.montantHT),
      tvaPct:       19,
      type:         affaire.type,
    });

    const updated = await prisma.affaire.update({
      where: { id: affaire.id },
      data: {
        devisId:     result.id,
        devisNumero: result.numero,
        devisPdfUrl: result.pdfUrl,
      },
    });
    await prisma.activite.create({
      data: {
        organizationId: affaire.organizationId,
        affaireId: affaire.id,
        type:      'DEVIS_CREE',
        title:     `Devis ${result.numero} créé`,
        content:   `Montant HT: ${affaire.montantHT} DT`,
      },
    });
    res.json({ affaire: updated, devis: result });
  } catch (e) { next(e); }
});

// ─── Créer une FACTURE dans Softfacture ─────────────────────────
softfactureRoutes.post('/facture/:affaireId', async (req, res, next) => {
  try {
    const affaire = await prisma.affaire.findUnique({
      where: { id: req.params.affaireId },
      include: { client: true },
    });
    if (!affaire) return res.status(404).json({ error: 'Affaire introuvable' });
    if (affaire.factureId) {
      return res.status(400).json({ error: 'Facture déjà créée', factureId: affaire.factureId });
    }

    const result = await softfactureClient.creerFacture({
      clientNom:       affaire.client.name,
      clientEmail:     affaire.client.email,
      clientMatricule: affaire.client.matricule,
      designation:     affaire.title || '',
      montantHT:       Number(affaire.montantHT),
      tvaPct:          19,
      type:            affaire.type,
      devisId:         affaire.devisId || undefined,
    });

    const updated = await prisma.affaire.update({
      where: { id: affaire.id },
      data: {
        factureId:     result.id,
        factureNumero: result.numero,
        facturePdfUrl: result.pdfUrl,
        statut:        affaire.statut === 'PIPELINE' ? 'REALISE' : affaire.statut,
        dateClotureReelle: affaire.dateClotureReelle || new Date(),
      },
    });
    await prisma.activite.create({
      data: {
        organizationId: affaire.organizationId,
        affaireId: affaire.id,
        type:      'FACTURE_CREEE',
        title:     `Facture ${result.numero} créée`,
        content:   `Montant TTC: ${Math.round(Number(affaire.montantHT) * 1.19)} DT`,
      },
    });
    res.json({ affaire: updated, facture: result });
  } catch (e) { next(e); }
});

// ─── Récupérer le PDF d'un document Softfacture ─────────────────
softfactureRoutes.get('/pdf/:type/:id', async (req, res, next) => {
  try {
    const { type, id } = req.params;
    if (!['devis', 'facture'].includes(type))
      return res.status(400).json({ error: 'Type invalide' });
    const pdfBuffer = await softfactureClient.getPdf(type as 'devis' | 'facture', id);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (e) { next(e); }
});
