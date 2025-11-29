REM ===============================================
REM 3-install.bat
REM Installer toutes les dépendances
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   📦 INSTALLATION DES DÉPENDANCES       ║
echo ╚══════════════════════════════════════════╝
echo.

echo 📦 Installation des dépendances du serveur...
cd server
call npm install
if errorlevel 1 (
    echo ❌ Erreur lors de l'installation serveur
    cd ..
    pause
    exit /b 1
)
echo    ✓ Serveur: dépendances installées
cd ..
echo.

echo 📦 Installation des dépendances du client...
cd client
call npm install
if errorlevel 1 (
    echo ❌ Erreur lors de l'installation client
    cd ..
    pause
    exit /b 1
)
echo    ✓ Client: dépendances installées
cd ..
echo.

echo ✅ Toutes les dépendances sont installées !
echo.
echo 👉 Pour développer: Exécutez 4-start-dev.bat
echo 👉 Pour production: Exécutez 5-deploy-prod.bat
echo.
pause