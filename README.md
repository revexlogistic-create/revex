# REVEX — Marketplace B2B Stock Dormant Industriel

> Plateforme marocaine de valorisation du stock PDR dormant industriel avec paiement escrow sécurisé, certification qualité A+ à D, transport retour à vide optimisé.

---

## ⚡ Installation rapide (5 minutes)

### Prérequis

| Outil | Version | Vérification |
|-------|---------|-------------|
| Node.js | >= 18 | `node -v` |
| PostgreSQL | >= 14 | `psql --version` |
| npm | >= 9 | `npm -v` |

---

## 📁 Structure du projet

```
revex/
├── backend/                 # API Node.js + Express
│   ├── config/db.js         # Connexion PostgreSQL
│   ├── controllers/         # Logique métier (auth, products, orders...)
│   ├── middleware/auth.js   # JWT + gestion des rôles
│   ├── routes/              # Routes API REST
│   ├── uploads/             # Fichiers uploadés (images, docs)
│   ├── server.js            # Point d'entrée
│   ├── package.json
│   └── .env.example
├── frontend/                # React.js
│   └── src/
│       ├── api/axios.js     # Client HTTP + refresh token
│       ├── contexts/        # AuthContext
│       ├── components/      # Composants réutilisables
│       └── pages/           # Toutes les pages
└── database/
    ├── schema.sql           # Schéma principal (13 tables)
    ├── schema_extension.sql # Extension processus vente (8 tables)
    └── seed.sql             # Données de test réalistes
```

---

## 🗄️ Étape 1 — Base de données PostgreSQL

```bash
# 1. Créer la base de données
psql -U postgres
CREATE DATABASE revex_db;
\q

# 2. Créer le schéma + extension + données de test
psql -U postgres -d revex_db -f database/schema.sql
psql -U postgres -d revex_db -f database/schema_extension.sql
psql -U postgres -d revex_db -f database/seed.sql
```

✅ Résultat attendu : `Seed data loaded successfully! | users_count: 8 | products_count: 7`

---

## 🔧 Étape 2 — Backend

```bash
cd backend

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env : mettre votre mot de passe PostgreSQL

# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev
```

✅ L'API démarre sur **http://localhost:5000**  
✅ Vérifier : http://localhost:5000/api/health

### Variables .env à configurer obligatoirement

```env
DB_PASSWORD=votre_mot_de_passe_postgres
JWT_SECRET=changez_ce_secret_en_production_minimum_32_chars
```

---

## ⚛️ Étape 3 — Frontend React

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm start
```

✅ L'application démarre sur **http://localhost:3000**

---

## 🔑 Comptes de test (mot de passe universel : `Password123!`)

| Rôle | Email | Accès |
|------|-------|-------|
| **Admin** | admin@revex.ma | Dashboard admin complet |
| **Vendeur 1** | vendeur1@cimencas.ma | Publication PDR, qualification |
| **Vendeur 2** | vendeur2@lafarge.ma | Stock PDR Meknès |
| **Vendeur 3** | vendeur3@ocp.ma | OCP Group Khouribga |
| **Acheteur 1** | acheteur1@managem.ma | Commandes, devis |
| **Acheteur 2** | acheteur2@jem.ma | Commandes |
| **Distributeur** | distrib@techparts.ma | Transport retour vide |

---

## 📡 API — Principales routes

### Authentification
```
POST   /api/auth/register      Inscription
POST   /api/auth/login         Connexion → JWT
POST   /api/auth/refresh       Renouveler le token
GET    /api/auth/me            Profil connecté
```

### Produits (PDR)
```
GET    /api/products           Liste + filtres + recherche
GET    /api/products/:id       Détail produit
POST   /api/products           Créer un PDR (vendeur)
PUT    /api/products/:id       Modifier
DELETE /api/products/:id       Archiver
GET    /api/products/me        Mes produits
POST   /api/products/:id/favorite  Toggle favori
```

### Commandes & Devis
```
POST   /api/orders             Passer commande
GET    /api/orders             Mes commandes
PUT    /api/orders/:id/status  Mettre à jour statut

POST   /api/quotes             Envoyer devis
GET    /api/quotes             Mes devis
PUT    /api/quotes/:id/respond Répondre (vendeur)
```

### Processus REVEX (Escrow, Litiges, Certificats)
```
POST   /api/analysis/stock               Analyser stock dormant
POST   /api/analysis/escrow              Sécuriser paiement
POST   /api/analysis/escrow/:id/release  Libérer paiement
POST   /api/analysis/disputes            Ouvrir litige
GET    /api/analysis/disputes            Mes litiges
POST   /api/analysis/certificates        Émettre certificat
GET    /api/analysis/certificates/verify/:hash  Vérifier certificat (public)
POST   /api/analysis/seller-qualification  Soumettre qualification
POST   /api/analysis/urgent              Demande urgente
POST   /api/analysis/price-suggestion    Suggestion de prix
```

### Transport
```
GET    /api/transport          Liste retours à vide
POST   /api/transport          Déclarer un retour à vide
```

### Messages
```
GET    /api/messages/conversations       Mes conversations
GET    /api/messages/conversations/:id  Messages d'une conversation
POST   /api/messages/send               Envoyer message
GET    /api/messages/notifications      Notifications
```

### Admin
```
GET    /api/admin/dashboard             Stats globales
GET    /api/admin/users                 Liste utilisateurs
PUT    /api/admin/users/:id/status      Activer/Suspendre
PUT    /api/admin/qualifications/:id    Approuver qualification
PUT    /api/admin/disputes/:id/resolve  Résoudre litige
```

---

## 🔄 Processus de vente intégré (PDF REVEX)

| Étape | Endpoint | Description |
|-------|----------|-------------|
| 1-3 | `POST /analysis/seller-qualification` | Qualification vendeur (RC, ICE, engagements) |
| 4-6 | `POST /products` avec `quality_grade` | Classification A+/A/B/C/D + Trust Score auto |
| 7-9 | `POST /analysis/price-suggestion` | Suggestion prix marché + enrichissement |
| 10 | `POST /analysis/escrow` | Paiement sécurisé escrow |
| 13 | `GET /transport` | Transport retour à vide |
| 14-15 | `POST /analysis/escrow/:id/release` | Validation réception + libération |
| 14-15 | `POST /analysis/disputes` | Ouverture litige si problème |
| 16 | `POST /analysis/certificates` | Certificat digital traçabilité |
| 18 | `POST /analysis/urgent` | Mode urgence maintenance SLA |

---

## 🧱 Architecture technique

```
Frontend React ──► API Express ──► PostgreSQL
     │                  │
     │            JWT Auth (bcrypt)
     │            Upload Multer (local)
     │            Rate Limiting
     │            Helmet (sécurité)
     │
 React Query (cache)
 React Router v6
 React Hook Form
 Recharts (admin)
```

---

## 🛠️ Commandes utiles

```bash
# Réinitialiser la base de données
psql -U postgres -c "DROP DATABASE IF EXISTS revex_db;"
psql -U postgres -c "CREATE DATABASE revex_db;"
psql -U postgres -d revex_db -f database/schema.sql
psql -U postgres -d revex_db -f database/schema_extension.sql
psql -U postgres -d revex_db -f database/seed.sql

# Voir les logs API en temps réel
cd backend && npm run dev

# Build production frontend
cd frontend && npm run build
```

---

## 🚀 Déploiement production

1. Configurer `NODE_ENV=production` dans `.env`
2. Générer des secrets JWT robustes (min 64 chars)
3. Configurer PostgreSQL avec SSL
4. Utiliser PM2 pour le backend : `pm2 start server.js --name revex-api`
5. Servir le frontend buildé avec Nginx
6. Configurer Cloudinary pour le stockage d'images cloud

---

## 📞 Support

Plateforme développée selon le processus de vente REVEX (PDF fourni).  
Données de test basées sur le marché industriel marocain.

**Stack complète :** React 18 + Node.js 18 + Express 4 + PostgreSQL 14
"# revex" 
