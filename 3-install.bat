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

REM Verifier si Node.js est accessible
node -v >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Node.js n est pas accessible !
    echo.
    echo Si Node.js est installe, essayez de :
    echo    - Redemarrer votre ordinateur
    echo    - Relancer ce script
    echo.
    echo Sinon, installez Node.js depuis :
    echo    https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Afficher les versions
echo Verification des outils...
for /f "tokens=*" %%i in ('node -v') do echo    Node.js: %%i
for /f "tokens=*" %%i in ('npm -v') do echo    npm: %%i
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
