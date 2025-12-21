@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    DEMARRAGE RAPIDE - MODE PRODUCTION
echo ================================================
echo.

REM Verifier que le build existe
if not exist "client\build\index.html" (
    echo [!] Le build n'existe pas encore.
    echo     Lancement du build...
    echo.
    cd client
    call npm run build
    cd ..
)

echo Demarrage du serveur...
echo.
echo Acces: http://localhost:3001
echo.
echo Appuyez sur Ctrl+C pour arreter
echo.
cd server
set NODE_ENV=production
node server.js