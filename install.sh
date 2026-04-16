#!/bin/bash
# ============================================================
# REVEX — Script d'installation automatique
# Usage : chmod +x install.sh && ./install.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════╗"
echo "║   REVEX — Installation automatique   ║"
echo "║   Marketplace B2B Stock Dormant      ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── Vérification Node.js ──
echo -e "${YELLOW}▶ Vérification Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js non trouvé. Installez Node.js >= 18 depuis https://nodejs.org${NC}"
  exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}✗ Node.js >= 18 requis. Version actuelle : $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# ── Vérification PostgreSQL ──
echo -e "${YELLOW}▶ Vérification PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${RED}✗ PostgreSQL non trouvé. Installez PostgreSQL >= 14${NC}"
  exit 1
fi
echo -e "${GREEN}✓ PostgreSQL détecté${NC}"

# ── Configuration DB ──
echo ""
echo -e "${YELLOW}▶ Configuration de la base de données${NC}"
read -p "  Utilisateur PostgreSQL [postgres] : " DB_USER
DB_USER=${DB_USER:-postgres}
read -s -p "  Mot de passe PostgreSQL : " DB_PASS
echo ""
read -p "  Nom de la base [revex_db] : " DB_NAME
DB_NAME=${DB_NAME:-revex_db}

# ── Créer la base ──
echo -e "${YELLOW}▶ Création de la base de données...${NC}"
PGPASSWORD=$DB_PASS psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
PGPASSWORD=$DB_PASS psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 
echo -e "${GREEN}✓ Base '$DB_NAME' créée${NC}"

# ── Exécuter les scripts SQL ──
echo -e "${YELLOW}▶ Installation du schéma...${NC}"
PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -f database/schema.sql -q
echo -e "${GREEN}✓ Schéma principal installé${NC}"

PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -f database/schema_extension.sql -q
echo -e "${GREEN}✓ Extension processus de vente installée${NC}"

echo -e "${YELLOW}▶ Chargement des données de test...${NC}"
PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -f database/seed.sql
echo -e "${GREEN}✓ Données de test chargées${NC}"

# ── Configurer .env backend ──
echo -e "${YELLOW}▶ Configuration du backend...${NC}"
cat > backend/.env << EOF
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
JWT_SECRET=revex_jwt_$(openssl rand -hex 16)
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=revex_refresh_$(openssl rand -hex 16)
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
EOF
echo -e "${GREEN}✓ Fichier .env backend configuré${NC}"

# ── Créer dossier uploads ──
mkdir -p backend/uploads/products backend/uploads/documents backend/uploads/qualification backend/uploads/stock
echo -e "${GREEN}✓ Dossiers uploads créés${NC}"

# ── Installer dépendances backend ──
echo -e "${YELLOW}▶ Installation des dépendances backend...${NC}"
cd backend && npm install --silent
echo -e "${GREEN}✓ Backend installé${NC}"
cd ..

# ── Installer dépendances frontend ──
echo -e "${YELLOW}▶ Installation des dépendances frontend...${NC}"
cd frontend && npm install --silent
echo -e "${GREEN}✓ Frontend installé${NC}"
cd ..

# ── Résumé ──
echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════╗"
echo "║          ✅ Installation réussie !            ║"
echo "╠══════════════════════════════════════════════╣"
echo "║                                              ║"
echo "║  Démarrer le backend :                       ║"
echo "║    cd backend && npm run dev                 ║"
echo "║    → http://localhost:5000                   ║"
echo "║                                              ║"
echo "║  Démarrer le frontend (autre terminal) :     ║"
echo "║    cd frontend && npm start                  ║"
echo "║    → http://localhost:3000                   ║"
echo "║                                              ║"
echo "║  Comptes de test (mdp: Password123!) :       ║"
echo "║    Admin   : admin@revex.ma                  ║"
echo "║    Vendeur : vendeur1@cimencas.ma            ║"
echo "║    Acheteur: acheteur1@managem.ma            ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"
