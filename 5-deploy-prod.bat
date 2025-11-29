REM ===============================================
REM 5-deploy-prod.bat
REM Build et déploiement production
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   🚀 DÉPLOIEMENT PRODUCTION              ║
echo ╚══════════════════════════════════════════╝
echo.

echo 📦 Build du client React...
cd client
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ Erreur lors du build du client
    cd ..
    pause
    exit /b 1
)
echo    ✓ Client build avec succès
cd ..
echo.

echo 📋 Vérification du build...
if not exist "client\build\index.html" (
    echo ❌ Erreur: Le build n'a pas créé les fichiers attendus
    pause
    exit /b 1
)
echo    ✓ Build vérifié
echo.

echo 📦 Installation des dépendances serveur...
cd server
call npm install --production
if errorlevel 1 (
    echo.
    echo ❌ Erreur lors de l'installation serveur
    cd ..
    pause
    exit /b 1
)
echo    ✓ Dépendances serveur installées
cd ..
echo.

echo ✅ Déploiement terminé avec succès !
echo.
echo 📁 Fichiers prêts pour la production:
echo    - client\build\ (fichiers statiques)
echo    - server\ (serveur Node.js)
echo.
echo 👉 Pour démarrer le serveur: Exécutez 6-start-prod.bat
echo.
pause