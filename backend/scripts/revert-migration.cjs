const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Reverse mapping to restore original values
const reverseMapping = {
  'Comptabilité Carbone': 'BILAN_CARBONE',
  'Abonnement': 'FORMATION',
};

async function revertMigration() {
  console.log('Début de la réversion de la migration...');

  // Récupérer toutes les affaires avec les valeurs migrées
  const affaires = await prisma.affaire.findMany({
    where: {
      OR: [
        { type: 'Comptabilité Carbone' },
        { type: 'Abonnement' },
      ],
    },
  });

  console.log(`Trouvé ${affaires.length} affaires à rétablir`);

  // Restaurer les valeurs originales
  for (const affaire of affaires) {
    const originalType = reverseMapping[affaire.type];
    if (originalType) {
      await prisma.affaire.update({
        where: { id: affaire.id },
        data: { type: originalType },
      });
      console.log(`Rétabli: ${affaire.type} → ${originalType} (ID: ${affaire.id})`);
    }
  }

  console.log('Réversion terminée avec succès!');
}

revertMigration()
  .catch((e) => {
    console.error('Erreur lors de la réversion:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
