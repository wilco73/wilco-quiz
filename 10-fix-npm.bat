@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   🔧 RÉPARER NPM INSTALL                 ║
echo ╚══════════════════════════════════════════╝
echo.

echo Ce script va:
echo  1. Nettoyer le cache npm
echo  2. Réinitialiser la configuration
echo  3. Supprimer node_modules existants
echo  4. Réinstaller proprement les dépendances
echo.
echo ⏱️  Durée estimée: 5-10 minutes
echo.
pause

echo.
echo [1/6] 🧹 Nettoyage du cache npm...
call npm cache clean --force 2>nul
if errorlevel 1 (
    echo    ⚠️  Avertissement: Le cache n'a pas pu être nettoyé complètement
) else (
    echo    ✓ Cache nettoyé
)
echo.

echo [2/6] 🔧 Réinitialisation de la configuration npm...
call npm config set registry https://registry.npmjs.org/
call npm config delete proxy 2>nul
call npm config delete https-proxy 2>nul
call npm config set fetch-timeout 60000
call npm config set fetch-retry-mintimeout 20000
call npm config set fetch-retry-maxtimeout 120000
echo    ✓ Configuration réinitialisée
echo.

echo [3/6] 📊 Vérification de la configuration...
echo    Registry: 
call npm config get registry
echo    Node version:
call node --version
echo    npm version:
call npm --version
echo.

echo [4/6] 🗑️  Suppression des installations précédentes...

if exist "client\node_modules" (
    echo    Suppression de client\node_modules...
    rmdir /s /q "client\node_modules" 2>nul
    echo    ✓ Supprimé
)

if exist "client\package-lock.json" (
    echo    Suppression de client\package-lock.json...
    del /q "client\package-lock.json" 2>nul
    echo    ✓ Supprimé
)

if exist "server\node_modules" (
    echo    Suppression de server\node_modules...
    rmdir /s /q "server\node_modules" 2>nul
    echo    ✓ Supprimé
)

if exist "server\package-lock.json" (
    echo    Suppression de server\package-lock.json...
    del /q "server\package-lock.json" 2>nul
    echo    ✓ Supprimé
)

echo.

echo [5/6] 📦 Installation des dépendances CLIENT...
echo    Cela peut prendre 3-5 minutes...
echo    Patientez, même si ça semble lent...
echo.
cd client

REM Installation avec sortie détaillée
call npm install --loglevel=info

if errorlevel 1 (
    echo.
    echo ❌ ERREUR lors de l'installation client
    echo.
    echo 💡 Solutions possibles:
    echo    1. Vérifiez votre connexion internet
    echo    2. Essayez: npm install --legacy-peer-deps
    echo    3. Vérifiez que Node.js est à jour
    echo    4. Désactivez temporairement l'antivirus
    echo.
    cd ..
    pause
    exit /b 1
)

echo.
echo    ✓ Dépendances client installées
cd ..
echo.

echo [6/6] 📦 Installation des dépendances SERVEUR...
echo    Presque terminé...
echo.
cd server

call npm install --loglevel=info

if errorlevel 1 (
    echo.
    echo ❌ ERREUR lors de l'installation serveur
    echo.
    echo 💡 Le serveur n'a besoin que de 2 packages (express, cors)
    echo    Vous pouvez les installer manuellement:
    echo    cd server
    echo    npm install express cors
    echo.
    cd ..
    pause
    exit /b 1
)

echo.
echo    ✓ Dépendances serveur installées
cd ..
echo.

echo ════════════════════════════════════════════
echo.
echo ✅ INSTALLATION TERMINÉE AVEC SUCCÈS !
echo.
echo 📊 Résumé:
if exist "client\node_modules" (
    echo    ✓ Client: node_modules présent
) else (
    echo    ✗ Client: node_modules MANQUANT
)

if exist "server\node_modules" (
    echo    ✓ Serveur: node_modules présent
) else (
    echo    ✗ Serveur: node_modules MANQUANT
)
echo.

echo 👉 Prochaines étapes:
echo    - Exécutez 7-check-structure.bat pour vérifier
echo    - Puis 4-start-dev.bat pour démarrer
echo.
pause