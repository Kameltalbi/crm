import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { AuthRequest } from '../middleware/auth.js';

export const previsionnelRoutes = Router();
previsionnelRoutes.use(auth);

previsionnelRoutes.get('/:annee', async (req: AuthRequest, res, next) => {
  try {
    const annee = Number(req.params.annee);
    const mois = await prisma.previsionMois.findMany({
      where: { annee, organizationId: req.organizationId },
      orderBy: { mois: 'asc' },
    });

    // Nouvelle logique de calcul : Réalisé (passé) + Prévisionnel (futur)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // CA Réalisé pour les mois passés
    const affairesReelles = await prisma.affaire.findMany({
      where: { 
        anneePrevue: annee, 
        statut: 'REALISE', 
        organizationId: req.organizationId 
      },
    });
    
    // CA Prévisionnel pour les mois futurs (basé sur probabilite)
    const affairesFutures = await prisma.affaire.findMany({
      where: { 
        anneePrevue: annee, 
        statut: { in: ['PROSPECT', 'QUALIFIE', 'PROPOSITION', 'NEGOCIATION'] },
        organizationId: req.organizationId 
      },
    });

    // Calcul par mois
    const caParMois: Record<number, { realise: number; previsionnel: number }> = {};
    
    // Initialiser tous les mois à 0
    for (let m = 1; m <= 12; m++) {
      caParMois[m] = { realise: 0, previsionnel: 0 };
    }

    // Ajouter CA réalisé (mois passés uniquement)
    for (const a of affairesReelles) {
      if (annee < currentYear || (annee === currentYear && a.moisPrevu <= currentMonth)) {
        caParMois[a.moisPrevu].realise += Number(a.montantHT);
      }
    }

    // Ajouter CA prévisionnel (mois futurs uniquement)
    for (const a of affairesFutures) {
      if (annee > currentYear || (annee === currentYear && a.moisPrevu > currentMonth)) {
        caParMois[a.moisPrevu].previsionnel += Number(a.montantHT) * (a.probabilite / 100);
      }
    }

    // Calcul de l'atterrissage annuel
    let caTotalAnnuel = 0;
    let caRealiseAnnuel = 0;
    let caPrevuAnnuel = 0;
    
    for (let m = 1; m <= 12; m++) {
      caTotalAnnuel += caParMois[m].realise + caParMois[m].previsionnel;
      caRealiseAnnuel += caParMois[m].realise;
      caPrevuAnnuel += caParMois[m].previsionnel;
    }

    // Moyenne mensuelle du réalisé
    const moisRealises = annee < currentYear ? 12 : currentMonth;
    const moyenneMensuelle = moisRealises > 0 ? caRealiseAnnuel / moisRealises : 0;

    // Projection automatique si les mois futurs ne sont pas remplis
    let caProjete = caTotalAnnuel;
    const moisFutursVides = [];
    for (let m = currentMonth + 1; m <= 12; m++) {
      if (caParMois[m].previsionnel === 0) {
        moisFutursVides.push(m);
      }
    }
    
    if (moisFutursVides.length > 0 && moyenneMensuelle > 0) {
      caProjete = caTotalAnnuel + (moyenneMensuelle * moisFutursVides.length);
    }

    const data = mois.map(m => {
      const caBilans = Number(m.prixMoyenBilan) * m.nbBilansPrevu;
      const caForm = Number(m.tarifJourFormation) * m.joursFormation;
      const total = caBilans + caForm;
      const commEstim = Math.round(total * Number(m.tauxPartenaire) / 100 * 0.40);
      return {
        ...m,
        prixMoyenBilan:     Number(m.prixMoyenBilan),
        tarifJourFormation: Number(m.tarifJourFormation),
        tauxPartenaire:     Number(m.tauxPartenaire),
        caBilansPrevu:      caBilans,
        caFormationsPrevu:  caForm,
        caTotalPrevu:       total,
        commissionEstimee:  commEstim,
        netEstime:          total - commEstim,
        caReelRealise:      caParMois[m.mois].realise,
        caPrevuMois:        caParMois[m.mois].previsionnel,
        chargeJours:        m.nbBilansPrevu * 4 + m.joursFormation,
      };
    });

    const totalHT       = data.reduce((s, m) => s + m.caTotalPrevu, 0);
    const totalComm     = data.reduce((s, m) => s + m.commissionEstimee, 0);
    const totalNet      = totalHT - totalComm;
    const totalBilans   = data.reduce((s, m) => s + m.caBilansPrevu, 0);
    const totalFormat   = data.reduce((s, m) => s + m.caFormationsPrevu, 0);
    const totalReel     = data.reduce((s, m) => s + m.caReelRealise, 0);

    res.json({
      annee,
      mois: data,
      totaux: {
        caBrutHT:        totalHT,
        caBilansHT:      totalBilans,
        caFormationsHT:  totalFormat,
        commissionEstimee: totalComm,
        tvaCollectee:    Math.round(totalHT * 0.19),
        netHT:           totalNet,
        caTTC:           Math.round(totalHT * 1.19),
        caReelRealise:   totalReel,
        // Nouveaux champs basés sur la logique Réalisé + Prévisionnel
        caTotalAnnuel:   Math.round(caTotalAnnuel),
        caRealiseAnnuel: Math.round(caRealiseAnnuel),
        caPrevuAnnuel:   Math.round(caPrevuAnnuel),
        moyenneMensuelle: Math.round(moyenneMensuelle),
        caProjete:       Math.round(caProjete),
        moisCourant:     currentMonth,
        anneeCourante:   currentYear,
      },
      caParMois,
    });
  } catch (e) { next(e); }
});

previsionnelRoutes.put('/:annee/:mois', async (req: AuthRequest, res, next) => {
  try {
    const { annee, mois } = req.params;
    const schema = z.object({
      nbBilansPrevu:     z.number().nonnegative().optional(),
      prixMoyenBilan:    z.number().nonnegative().optional(),
      joursFormation:    z.number().nonnegative().optional(),
      tarifJourFormation:z.number().nonnegative().optional(),
      tauxPartenaire:    z.number().min(0).max(100).optional(),
      notes:             z.string().optional(),
    });
    const data = schema.parse(req.body);

    const updated = await prisma.previsionMois.upsert({
      where:  { 
        organizationId_annee_mois: { 
          organizationId: req.organizationId!, 
          annee: Number(annee), 
          mois: Number(mois) 
        } 
      },
      update: data,
      create: { 
        organizationId: req.organizationId!,
        annee: Number(annee), 
        mois: Number(mois), 
        ...data 
      },
    });
    res.json(updated);
  } catch (e) { next(e); }
});
