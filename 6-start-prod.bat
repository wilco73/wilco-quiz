REM ===============================================
REM 6-start-prod.bat
REM Demarrer en mode production
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    MODE PRODUCTION
echo ================================================
echo.

REM Verifier que le build existe
if not exist "client\build\index.html" (
    echo [ERREUR] Le build du client n'existe pas
    echo.
    echo Executez d'abord: 5-deploy-prod.bat
    echo.
    pause
    exit /b 1
)

echo Demarrage du serveur en mode production...
echo.
echo Le serveur servira:
echo    - L'API sur /api/*
echo    - L'application React sur /*
echo.
echo Une fois demarre, accedez a:
echo    - Local: http://localhost:3001
echo    - Reseau: http://VOTRE_IP:3001
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.
echo ================================================
echo.

cd server
set NODE_ENV=production
node server.js
