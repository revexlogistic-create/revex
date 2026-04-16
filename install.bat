@echo off
REM ============================================================
REM REVEX — Script d'installation Windows
REM Double-cliquer pour lancer
REM ============================================================

echo.
echo  ╔══════════════════════════════════════╗
echo  ║   REVEX — Installation automatique   ║
echo  ╚══════════════════════════════════════╝
echo.

REM Demander les infos DB
set /p DB_USER="Utilisateur PostgreSQL [postgres]: "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_PASS="Mot de passe PostgreSQL: "
set /p DB_NAME="Nom de la base [revex_db]: "
if "%DB_NAME%"=="" set DB_NAME=revex_db

REM Créer la base
echo.
echo [1/5] Creation de la base de donnees...
set PGPASSWORD=%DB_PASS%
psql -U %DB_USER% -c "DROP DATABASE IF EXISTS %DB_NAME%;" 2>nul
psql -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;"
echo OK - Base creee

REM Schemas SQL
echo [2/5] Installation du schema...
psql -U %DB_USER% -d %DB_NAME% -f database\schema.sql -q
psql -U %DB_USER% -d %DB_NAME% -f database\schema_extension.sql -q
psql -U %DB_USER% -d %DB_NAME% -f database\seed.sql
echo OK - Schema installe

REM Configurer .env
echo [3/5] Configuration backend...
(
echo NODE_ENV=development
echo PORT=5000
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_NAME=%DB_NAME%
echo DB_USER=%DB_USER%
echo DB_PASSWORD=%DB_PASS%
echo JWT_SECRET=revex_jwt_secret_changez_en_production_2024
echo JWT_EXPIRES_IN=7d
echo JWT_REFRESH_SECRET=revex_refresh_secret_changez_en_production_2024
echo JWT_REFRESH_EXPIRES_IN=30d
echo FRONTEND_URL=http://localhost:3000
echo UPLOAD_DIR=./uploads
echo MAX_FILE_SIZE=5242880
) > backend\.env
echo OK - .env configure

REM Créer dossiers
mkdir backend\uploads\products 2>nul
mkdir backend\uploads\documents 2>nul
mkdir backend\uploads\qualification 2>nul

REM Installer dépendances
echo [4/5] Installation backend (npm install)...
cd backend
call npm install --silent
cd ..
echo OK - Backend installe

echo [5/5] Installation frontend (npm install)...
cd frontend
call npm install --silent
cd ..
echo OK - Frontend installe

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║       Installation reussie !                 ║
echo  ╠══════════════════════════════════════════════╣
echo  ║                                              ║
echo  ║  Terminal 1 - Backend :                      ║
echo  ║    cd backend ^& npm run dev                  ║
echo  ║    http://localhost:5000                     ║
echo  ║                                              ║
echo  ║  Terminal 2 - Frontend :                     ║
echo  ║    cd frontend ^& npm start                   ║
echo  ║    http://localhost:3000                     ║
echo  ║                                              ║
echo  ║  Comptes test (mdp: Password123!) :          ║
echo  ║    admin@revex.ma                            ║
echo  ║    vendeur1@cimencas.ma                      ║
echo  ║    acheteur1@managem.ma                      ║
echo  ╚══════════════════════════════════════════════╝
echo.
pause
