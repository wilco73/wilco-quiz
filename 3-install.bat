REM ===============================================
REM 3-install.bat
REM Installer toutes les dependances
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    INSTALLATION DES DEPENDANCES
echo ================================================
echo.

echo Installation des dependances du serveur...
echo    (inclut SQLite et bcrypt pour la securite)
cd server
call npm install
if errorlevel 1 (
    echo [ERREUR] Erreur lors de l'installation serveur
    echo.
    echo Si bcrypt echoue, essayez:
    echo    npm install --build-from-source
    cd ..
    pause
    exit /b 1
)
echo    [OK] Serveur: dependances installees (SQLite + bcrypt)
cd ..
echo.

echo Installation des dependances du client...
cd client
call npm install
if errorlevel 1 (
    echo [ERREUR] Erreur lors de l'installation client
    cd ..
    pause
    exit /b 1
)
echo    [OK] Client: dependances installees
cd ..
echo.

echo ================================================
echo    TOUTES LES DEPENDANCES SONT INSTALLEES !
echo ================================================
echo.
echo Si vous avez un ancien db.json, executez d'abord:
echo    cd server ^&^& npm run migrate
echo.
echo Pour developper: Executez 4-start-dev.bat
echo Pour production: Executez 5-deploy-prod.bat
echo.
pause
