# 🚀 Guide de déploiement — Bilan CRM

Déploiement sur VPS Ubuntu 24.04 LTS via Git.

## 📋 Prérequis

- Un VPS Ubuntu 24.04 avec accès SSH
- Un nom de domaine pointé vers l'IP du VPS (ex: `crm.tondomaine.com`)
- Un compte GitHub avec le repo `bilan-crm` créé
- Les accès OAuth Gmail configurés (voir [GMAIL.md](GMAIL.md))

---

## 1️⃣ Setup initial du VPS (une seule fois)

### Se connecter au VPS
```bash
ssh tonuser@ton-ip-vps
```

### Exécuter le setup automatique
```bash
# Télécharger et exécuter le script de setup
curl -O https://raw.githubusercontent.com/TON-USER/bilan-crm/main/scripts/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

Le script fait :
- ✅ Update système Ubuntu
- ✅ Installation Docker + Docker Compose
- ✅ Configuration firewall (ports 80, 443, 22)
- ✅ Installation fail2ban
- ✅ Création du dossier `/opt/bilan-crm`

**⚠️ Déconnecte-toi puis reconnecte-toi** pour utiliser Docker sans `sudo`.

---

## 2️⃣ Cloner le projet

### Générer une clé SSH sur le VPS
```bash
ssh-keygen -t ed25519 -C "vps-bilan-crm"
cat ~/.ssh/id_ed25519.pub
```

### Ajouter cette clé dans GitHub
- GitHub → Settings → SSH and GPG keys → New SSH key
- Coller la clé publique

### Cloner le repo
```bash
cd /opt/bilan-crm
git clone git@github.com:TON-USER/bilan-crm.git .
```

---

## 3️⃣ Configuration

### Copier et remplir le .env
```bash
cp .env.example .env
nano .env
```

Remplir **obligatoirement** :

```env
# Base de données
POSTGRES_USER="bilan"
POSTGRES_PASSWORD="genere-un-mot-de-passe-fort-aleatoire"
POSTGRES_DB="bilan_crm"

# JWT
JWT_SECRET="genere-une-chaine-aleatoire-de-32-caracteres-minimum"

# Domaine
DOMAIN="crm.tondomaine.com"
FRONTEND_URL="https://crm.tondomaine.com"

# Softfacture API
SOFTFACTURE_API_URL="https://api.softfacture.com"
SOFTFACTURE_API_KEY="ton-api-key-softfacture"

# Google OAuth (voir GMAIL.md)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="https://crm.tondomaine.com/api/gmail/callback"
```

**Générer des secrets forts** :
```bash
openssl rand -base64 32
```

---

## 4️⃣ DNS — Pointer le domaine

Chez ton registrar, créer un enregistrement A :
```
crm.tondomaine.com  →  IP-de-ton-VPS
```

Attendre la propagation (quelques minutes à quelques heures).

**Vérifier** :
```bash
dig crm.tondomaine.com
```

---

## 5️⃣ Premier démarrage

```bash
cd /opt/bilan-crm

# Build des images
docker compose -f docker-compose.prod.yml build

# Démarrer tous les services
docker compose -f docker-compose.prod.yml up -d

# Voir les logs
docker compose -f docker-compose.prod.yml logs -f
```

Caddy va automatiquement :
- Obtenir un certificat SSL via Let's Encrypt
- Configurer HTTPS
- Rediriger HTTP → HTTPS

**Attendre ~30 secondes** puis ouvrir `https://crm.tondomaine.com`

### Initialiser la BDD avec les données
```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

**Identifiants par défaut** : `admin@bilan-crm.tn` / `changeme123`
⚠️ **Change le mot de passe immédiatement après la première connexion !**

---

## 6️⃣ Déploiements suivants

Workflow de mise à jour manuel via Git :

```bash
# En local, après tes modifs
git add . && git commit -m "feat: nouvelle fonctionnalité"
git push origin main

# Sur le VPS
ssh tonuser@vps
cd /opt/bilan-crm
./scripts/deploy.sh
```

Le script `deploy.sh` fait automatiquement :
- `git pull`
- Rebuild des images
- Restart des containers
- Applique les nouvelles migrations
- Nettoie les vieilles images Docker

---

## 🔍 Commandes utiles

```bash
# Statut des services
docker compose -f docker-compose.prod.yml ps

# Logs en temps réel
docker compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f caddy

# Redémarrer un service
docker compose -f docker-compose.prod.yml restart backend

# Entrer dans un container
docker compose -f docker-compose.prod.yml exec backend sh

# Backup de la BDD
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U bilan bilan_crm > backup-$(date +%Y%m%d).sql

# Restaurer une BDD
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U bilan bilan_crm < backup.sql

# Tout arrêter
docker compose -f docker-compose.prod.yml down

# Tout arrêter + supprimer volumes (⚠️ efface la BDD)
docker compose -f docker-compose.prod.yml down -v
```

---

## 🔐 Sécurité

### Changer le mot de passe admin
1. Se connecter sur `https://crm.tondomaine.com`
2. Aller dans Paramètres → Changer mot de passe

### Backups automatiques de la BDD
Créer un cron :
```bash
crontab -e
```
Ajouter :
```cron
0 3 * * * cd /opt/bilan-crm && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U bilan bilan_crm | gzip > /opt/backups/db-$(date +\%Y\%m\%d).sql.gz
```

### Mises à jour système
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 🆘 Troubleshooting

### Le site ne répond pas
```bash
# Vérifier que Caddy tourne
docker compose -f docker-compose.prod.yml ps caddy

# Logs Caddy
docker compose -f docker-compose.prod.yml logs caddy

# Vérifier que le DNS est propagé
dig crm.tondomaine.com
```

### Erreur 502 Bad Gateway
Le backend n'est pas accessible. Vérifier :
```bash
docker compose -f docker-compose.prod.yml logs backend
```

### BDD vide après redémarrage
Le volume `postgres-data` a été supprimé. Les données sont perdues — restaurer depuis un backup.

### Certificat SSL non obtenu
Caddy ne peut pas valider le domaine. Vérifier :
- Le DNS pointe bien vers l'IP
- Les ports 80 et 443 sont ouverts sur le firewall
- `docker compose logs caddy` pour voir l'erreur exacte
