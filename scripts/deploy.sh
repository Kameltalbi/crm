#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════
#  SCRIPT DE DÉPLOIEMENT — Bilan CRM
#  Usage : ssh vps "cd /opt/bilan-crm && ./scripts/deploy.sh"
# ═══════════════════════════════════════════════════════════════

cd "$(dirname "$0")/.."

echo "🚀 Déploiement Bilan CRM"
echo "════════════════════════════"

# 1. Pull du code
echo ""
echo "📥 Pull Git..."
git pull origin main

# 2. Vérifier .env
if [ ! -f .env ]; then
  echo "❌ Fichier .env manquant. Copie .env.example → .env et remplis-le."
  exit 1
fi

# 3. Build et redémarrer
echo ""
echo "🔨 Build Docker..."
docker compose -f docker-compose.prod.yml build --pull

echo ""
echo "🔄 Redémarrage..."
docker compose -f docker-compose.prod.yml up -d

# 4. Migrations Prisma (au cas où le schéma a changé)
echo ""
echo "🗄️  Migrations Prisma..."
sleep 5  # Attendre postgres
docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

# 5. Nettoyer les vieilles images
echo ""
echo "🧹 Nettoyage..."
docker image prune -f

echo ""
echo "✅ Déploiement terminé !"
echo "   Vérifier : docker compose -f docker-compose.prod.yml ps"
echo "   Logs     : docker compose -f docker-compose.prod.yml logs -f"
