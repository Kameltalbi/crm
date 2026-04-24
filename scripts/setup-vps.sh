#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════
#  SETUP INITIAL DU VPS — À exécuter UNE SEULE FOIS
#  Ubuntu 24.04 LTS
# ═══════════════════════════════════════════════════════════════

echo "🚀 Setup VPS pour Bilan CRM"
echo "════════════════════════════"

# 1. Update système
echo ""
echo "📦 Update système..."
sudo apt update && sudo apt upgrade -y

# 2. Dépendances de base
echo ""
echo "🔧 Installation dépendances..."
sudo apt install -y git curl ufw fail2ban

# 3. Docker + Docker Compose
if ! command -v docker &> /dev/null; then
  echo ""
  echo "🐳 Installation Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER
  echo "⚠️  Reconnecte-toi pour utiliser Docker sans sudo"
fi

# 4. Firewall
echo ""
echo "🔒 Configuration firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 5. Fail2ban pour SSH
echo ""
echo "🛡️  Configuration fail2ban..."
sudo systemctl enable --now fail2ban

# 6. Créer le dossier applicatif
echo ""
echo "📁 Création /opt/bilan-crm..."
sudo mkdir -p /opt/bilan-crm
sudo chown $USER:$USER /opt/bilan-crm

echo ""
echo "✅ Setup VPS terminé !"
echo ""
echo "Prochaines étapes :"
echo "  1. cd /opt/bilan-crm"
echo "  2. git clone git@github.com:TON-USER/bilan-crm.git ."
echo "  3. cp .env.example .env && nano .env  (remplir les variables)"
echo "  4. Faire pointer crm.tondomaine.com vers l'IP du VPS"
echo "  5. docker compose -f docker-compose.prod.yml up -d"
