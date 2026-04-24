# 📧 Configuration Gmail

Pour pouvoir envoyer des emails depuis le CRM, il faut créer une application OAuth2 chez Google.

## 1. Créer un projet Google Cloud

1. Aller sur https://console.cloud.google.com/
2. Créer un nouveau projet : `bilan-crm`
3. Dans le menu → "API et services" → "Bibliothèque"
4. Rechercher et activer : **Gmail API**

## 2. Créer un écran de consentement OAuth

1. Menu → "API et services" → "Écran de consentement OAuth"
2. Type d'utilisateur : **Externe** (ou Interne si Google Workspace)
3. Remplir :
   - Nom de l'application : `Bilan CRM`
   - Email de support : ton email
   - Domaines autorisés : `tondomaine.com`
4. Scopes : ajouter
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Utilisateurs de test : ajoute ton email (pendant la phase de dev)

## 3. Créer des credentials OAuth

1. Menu → "API et services" → "Identifiants"
2. "Créer des identifiants" → "ID client OAuth"
3. Type : **Application Web**
4. Nom : `Bilan CRM Backend`
5. URIs de redirection autorisées :
   - Dev : `http://localhost:4000/api/gmail/callback`
   - Prod : `https://crm.tondomaine.com/api/gmail/callback`
6. **Copier** Client ID et Client Secret

## 4. Configurer le .env

```env
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
GOOGLE_REDIRECT_URI="https://crm.tondomaine.com/api/gmail/callback"
```

## 5. Connecter son compte dans le CRM

1. Se connecter au CRM
2. Aller dans **Paramètres**
3. Cliquer "Connecter Gmail"
4. Autoriser l'accès
5. Retour automatique sur le CRM avec "Gmail connecté ✅"

## 6. Publier l'application (optionnel pour usage solo)

Tant que tu es seul à utiliser le CRM (mode test), pas besoin de publier l'app. Google limite à 100 utilisateurs test.

Pour une utilisation pro, il faut soumettre l'app en vérification Google (plusieurs semaines).
