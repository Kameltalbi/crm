import { PrismaClient, AffaireType, StatutAffaire } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── USER ADMIN ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash('changeme123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@bilan-crm.tn' },
    update: {},
    create: {
      email: 'admin@bilan-crm.tn',
      passwordHash,
      name: 'Admin',
      role: 'owner',
    },
  });
  console.log(`✅ User: ${user.email} (password: changeme123)`);

  // ─── CLIENTS ─────────────────────────────────────────────
  const clients = [
    { name: 'SMIPE' },
    { name: 'ENNAKL' },
    { name: 'IRIS' },
    { name: 'BH Lease' },
    { name: 'Triki' },
    { name: 'CCI Tuniso-Allemande' },
    { name: 'UBCI' },
    { name: 'CCITF' },
  ];

  const clientMap: Record<string, string> = {};
  for (const c of clients) {
    const created = await prisma.client.upsert({
      where: { id: c.name },
      update: {},
      create: { id: c.name, name: c.name, createdById: user.id },
    });
    clientMap[c.name] = created.id;
  }
  console.log(`✅ ${clients.length} clients`);

  // ─── AFFAIRES 2026 ────────────────────────────────────────
  const affaires = [
    { client: 'SMIPE',    title: 'Bilan Carbone SMIPE',    type: AffaireType.BILAN_CARBONE, montantHT: 2300,  statut: StatutAffaire.REALISE,  mois: 1, probabilite: 100 },
    { client: 'ENNAKL',   title: 'Bilan Carbone ENNAKL',   type: AffaireType.BILAN_CARBONE, montantHT: 13800, statut: StatutAffaire.REALISE,  mois: 2, probabilite: 100 },
    { client: 'IRIS',     title: 'Bilan Carbone IRIS',     type: AffaireType.BILAN_CARBONE, montantHT: 3000,  statut: StatutAffaire.PIPELINE, mois: 4, probabilite: 80 },
    { client: 'BH Lease', title: 'Bilan Carbone BH Lease', type: AffaireType.BILAN_CARBONE, montantHT: 8900,  statut: StatutAffaire.PIPELINE, mois: 4, probabilite: 75 },
    { client: 'Triki',    title: 'Bilan Carbone Triki',    type: AffaireType.BILAN_CARBONE, montantHT: 11000, statut: StatutAffaire.PIPELINE, mois: 5, probabilite: 80 },
    { client: 'CCI Tuniso-Allemande', title: 'Formation CCI Tuniso-Allemande (4j)', type: AffaireType.FORMATION, montantHT: 4800, statut: StatutAffaire.PIPELINE, mois: 6, probabilite: 85 },
    { client: 'UBCI',  title: 'Bilan Carbone UBCI',  type: AffaireType.BILAN_CARBONE, montantHT: 18900, statut: StatutAffaire.PIPELINE, mois: 6, probabilite: 70 },
    { client: 'CCITF', title: 'Bilan Carbone CCITF', type: AffaireType.BILAN_CARBONE, montantHT: 20000, statut: StatutAffaire.PIPELINE, mois: 9, probabilite: 70 },
  ];

  for (const a of affaires) {
    await prisma.affaire.create({
      data: {
        title: a.title,
        type: a.type,
        montantHT: a.montantHT,
        statut: a.statut,
        probabilite: a.probabilite,
        moisPrevu: a.mois,
        anneePrevue: 2026,
        viaPartenaire: false,
        tauxCommission: 40,
        clientId: clientMap[a.client],
        createdById: user.id,
      },
    });
  }
  console.log(`✅ ${affaires.length} affaires`);

  // ─── PRÉVISIONNEL ─────────────────────────────────────────
  const prevData: Array<{ annee: number; mois: number; nb: number; prix: number; jf: number; tj: number; sum?: boolean; taux?: number }> = [
    // 2026
    { annee: 2026, mois: 1,  nb: 1, prix: 2300,  jf: 0, tj: 0 },
    { annee: 2026, mois: 2,  nb: 1, prix: 13800, jf: 0, tj: 0 },
    { annee: 2026, mois: 3,  nb: 0, prix: 0,     jf: 0, tj: 0 },
    { annee: 2026, mois: 4,  nb: 2, prix: 5950,  jf: 0, tj: 0 },
    { annee: 2026, mois: 5,  nb: 2, prix: 9000,  jf: 0, tj: 0 },
    { annee: 2026, mois: 6,  nb: 1, prix: 18900, jf: 4, tj: 1200 },
    { annee: 2026, mois: 7,  nb: 0, prix: 0,     jf: 0, tj: 0, sum: true },
    { annee: 2026, mois: 8,  nb: 0, prix: 0,     jf: 0, tj: 0, sum: true },
    { annee: 2026, mois: 9,  nb: 2, prix: 14000, jf: 0, tj: 0, taux: 30 },
    { annee: 2026, mois: 10, nb: 1, prix: 8000,  jf: 2, tj: 1500, taux: 30 },
    { annee: 2026, mois: 11, nb: 1, prix: 8000,  jf: 0, tj: 0, taux: 30 },
    { annee: 2026, mois: 12, nb: 1, prix: 7000,  jf: 2, tj: 1500, taux: 30 },
    // 2027
    { annee: 2027, mois: 1,  nb: 2, prix: 10000, jf: 4, tj: 1500, taux: 30 },
    { annee: 2027, mois: 2,  nb: 2, prix: 10000, jf: 4, tj: 1500, taux: 30 },
    { annee: 2027, mois: 3,  nb: 3, prix: 11000, jf: 5, tj: 1500, taux: 30 },
    { annee: 2027, mois: 4,  nb: 2, prix: 11000, jf: 5, tj: 1500, taux: 30 },
    { annee: 2027, mois: 5,  nb: 3, prix: 12000, jf: 5, tj: 1500, taux: 30 },
    { annee: 2027, mois: 6,  nb: 3, prix: 12000, jf: 5, tj: 1500, taux: 30 },
    { annee: 2027, mois: 7,  nb: 0, prix: 0,     jf: 1, tj: 1500, sum: true },
    { annee: 2027, mois: 8,  nb: 1, prix: 9000,  jf: 2, tj: 1500, sum: true },
    { annee: 2027, mois: 9,  nb: 3, prix: 12000, jf: 5, tj: 1500, taux: 30 },
    { annee: 2027, mois: 10, nb: 3, prix: 13000, jf: 5, tj: 1500, taux: 30 },
    { annee: 2027, mois: 11, nb: 2, prix: 13000, jf: 4, tj: 1500, taux: 30 },
    { annee: 2027, mois: 12, nb: 2, prix: 12000, jf: 3, tj: 1500, taux: 30 },
    // 2028
    { annee: 2028, mois: 1,  nb: 2, prix: 12000, jf: 5, tj: 1700, taux: 30 },
    { annee: 2028, mois: 2,  nb: 3, prix: 12000, jf: 5, tj: 1700, taux: 30 },
    { annee: 2028, mois: 3,  nb: 3, prix: 13000, jf: 6, tj: 1700, taux: 30 },
    { annee: 2028, mois: 4,  nb: 3, prix: 13000, jf: 6, tj: 1700, taux: 30 },
    { annee: 2028, mois: 5,  nb: 3, prix: 14000, jf: 6, tj: 1700, taux: 30 },
    { annee: 2028, mois: 6,  nb: 3, prix: 14000, jf: 6, tj: 1700, taux: 30 },
    { annee: 2028, mois: 7,  nb: 0, prix: 0,     jf: 2, tj: 1600, sum: true },
    { annee: 2028, mois: 8,  nb: 1, prix: 10000, jf: 2, tj: 1600, sum: true },
    { annee: 2028, mois: 9,  nb: 3, prix: 14000, jf: 6, tj: 1700, taux: 30 },
    { annee: 2028, mois: 10, nb: 3, prix: 15000, jf: 6, tj: 1700, taux: 30 },
    { annee: 2028, mois: 11, nb: 3, prix: 15000, jf: 5, tj: 1700, taux: 30 },
    { annee: 2028, mois: 12, nb: 2, prix: 14000, jf: 4, tj: 1700, taux: 30 },
  ];

  for (const p of prevData) {
    await prisma.previsionMois.upsert({
      where: { annee_mois: { annee: p.annee, mois: p.mois } },
      update: {},
      create: {
        annee: p.annee,
        mois: p.mois,
        nbBilansPrevu: p.nb,
        prixMoyenBilan: p.prix,
        joursFormation: p.jf,
        tarifJourFormation: p.tj,
        estEte: p.sum || false,
        tauxPartenaire: p.taux || 0,
      },
    });
  }
  console.log(`✅ ${prevData.length} mois de prévisionnel`);
  
  console.log('\n🎉 Seeding completed!');
  console.log('👤 Login: admin@bilan-crm.tn / changeme123\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
