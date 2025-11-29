REM ===============================================
REM 6-start-prod.bat
REM Démarrer en mode production
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   🚀 MODE PRODUCTION                     ║
echo ╚══════════════════════════════════════════╝
echo.

REM Vérifier que le build existe
if not exist "client\build\index.html" (
    echo ❌ Erreur: Le build du client n'existe pas
    echo.
    echo Exécutez d'abord: 5-deploy-prod.bat
    echo.
    pause
    exit /b 1
)

echo 🔌 Démarrage du serveur en mode production...
echo.
echo 📡 Le serveur servira:
echo    - L'API sur /api/*
echo    - L'application React sur /*
echo.
echo 🌐 Une fois démarré, accédez à:
echo    - Local: http://localhost:3001
echo    - Réseau: http://votre-ip:32769 (selon config)
echo.
echo 💡 Appuyez sur Ctrl+C pour arrêter le serveur
echo.
echo ═══════════════════════════════════════════
echo.

cd server
set NODE_ENV=production
node server.js