import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping des anciennes valeurs vers les nouvelles catégories
const categoryMapping: Record<string, string> = {
  'BILAN_CARBONE': 'Comptabilité Carbone',
  'FORMATION': 'Abonnement', // ou une autre catégorie selon vos besoins
};

async function migrateCategories() {
  console.log('Début de la migration des catégories...');

  // Récupérer toutes les affaires
  const affaires = await prisma.affaire.findMany({
    where: {
      OR: [
        { type: 'BILAN_CARBONE' },
        { type: 'FORMATION' },
      ],
    },
  });

  console.log(`Trouvé ${affaires.length} affaires à migrer`);

  // Mettre à jour chaque affaire
  for (const affaire of affaires) {
    const newType = categoryMapping[affaire.type];
    if (newType) {
      await prisma.affaire.update({
        where: { id: affaire.id },
        data: { type: newType },
      });
      console.log(`Migré: ${affaire.type} → ${newType} (ID: ${affaire.id})`);
    }
  }

  console.log('Migration terminée avec succès!');
}

migrateCategories()
  .catch((e) => {
    console.error('Erreur lors de la migration:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
