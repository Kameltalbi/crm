export type AffaireType = 'BILAN_CARBONE' | 'FORMATION';
export type StatutAffaire = 'PROSPECTION' | 'PIPELINE' | 'REALISE' | 'PERDU';
export type ActiviteType = 'NOTE' | 'APPEL' | 'EMAIL_ENVOYE' | 'EMAIL_RECU' | 'RDV' | 'CHANGEMENT_STATUT' | 'DEVIS_CREE' | 'FACTURE_CREEE' | 'AUTRE';
export type UserRole = 'OWNER' | 'PARTNER';
export type ProductType = 'SERVICE' | 'PRODUCT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: ProductType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  matricule?: string | null;
  notes?: string | null;
  _count?: { affaires: number };
}

export interface Affaire {
  id: string;
  clientId: string;
  client: Client;
  type: AffaireType;
  title: string;
  description?: string | null;
  montantHT: string | number;
  statut: StatutAffaire;
  probabilite: number;
  moisPrevu: number;
  anneePrevue: number;
  viaPartenaire: boolean;
  tauxCommission: string | number;
  devisId?: string | null;
  devisNumero?: string | null;
  devisPdfUrl?: string | null;
  factureId?: string | null;
  factureNumero?: string | null;
  facturePdfUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  dateClotureReelle?: string | null;
}

export interface Activite {
  id: string;
  affaireId: string;
  type: ActiviteType;
  title: string;
  content?: string | null;
  createdAt: string;
}

export interface SmartForecast {
  forecast: number;
  lowerBound: number;
  upperBound: number;
  confidenceScore: number;
  conversionRates: {
    overall: number;
    prospectToPipeline: number;
    pipelineToRealise: number;
  };
  breakdown: {
    realise: number;
    adjustedPipeline: number;
    adjustedProspect: number;
  };
}

export interface KPIs {
  annee: number;
  caRealise: number;
  caPipeline: number;
  caProspection: number;
  caTotal: number;
  caPondere: number;
  commissionPartenaireDue: number;
  netRealise: number;
  caBilans: number;
  caFormations: number;
  counts: { realise: number; pipeline: number; prospect: number; perdu: number };
  parMois: Record<number, { realise: number; pipeline: number; prospect: number }>;
  smartForecast?: SmartForecast;
}

export interface PrevisionMois {
  id: string;
  annee: number;
  mois: number;
  nbBilansPrevu: number;
  prixMoyenBilan: number;
  joursFormation: number;
  tarifJourFormation: number;
  estEte: boolean;
  tauxPartenaire: number;
  caBilansPrevu: number;
  caFormationsPrevu: number;
  caTotalPrevu: number;
  commissionEstimee: number;
  netEstime: number;
  caReelRealise: number;
  chargeJours: number;
  notes?: string | null;
}

export interface Previsionnel {
  annee: number;
  mois: PrevisionMois[];
  totaux: {
    caBrutHT: number;
    caBilansHT: number;
    caFormationsHT: number;
    commissionEstimee: number;
    tvaCollectee: number;
    netHT: number;
    caTTC: number;
    caReelRealise: number;
  };
}
