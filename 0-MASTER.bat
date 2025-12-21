REM ===============================================
REM 0-MASTER.bat
REM Menu principal pour tout gerer
REM ===============================================
@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM Verifier si Node.js est installe (plusieurs methodes)
set "NODE_FOUND=0"
set "NODE_VERSION="

REM Methode 1: Essayer d executer node directement
node -v >nul 2>nul
if not errorlevel 1 (
    set "NODE_FOUND=1"
    for /f "tokens=*" %%i in ('node -v 2^>nul') do set "NODE_VERSION=%%i"
)

REM Methode 2: Chercher dans Program Files si methode 1 echoue
if "%NODE_FOUND%"=="0" (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "NODE_FOUND=1"
        for /f "tokens=*" %%i in ('"%ProgramFiles%\nodejs\node.exe" -v 2^>nul') do set "NODE_VERSION=%%i"
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    )
)

REM Methode 3: Chercher dans Program Files x86
if "%NODE_FOUND%"=="0" (
    if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "NODE_FOUND=1"
        for /f "tokens=*" %%i in ('"%ProgramFiles(x86)%\nodejs\node.exe" -v 2^>nul') do set "NODE_VERSION=%%i"
        set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
    )
)

REM Methode 4: Chercher dans AppData (nvm, etc.)
if "%NODE_FOUND%"=="0" (
    if exist "%APPDATA%\npm\node.exe" (
        set "NODE_FOUND=1"
        for /f "tokens=*" %%i in ('"%APPDATA%\npm\node.exe" -v 2^>nul') do set "NODE_VERSION=%%i"
    )
)

REM Si Node.js n est toujours pas trouve
if "%NODE_FOUND%"=="0" (
    cls
    echo.
    echo ================================================================
    echo.
    echo    [!] Node.js n a pas ete detecte
    echo.
    echo ================================================================
    echo.
    echo    Node.js est necessaire pour faire fonctionner Wilco Quiz.
    echo.
    echo    Si Node.js est deja installe, vous devrez peut-etre :
    echo    - Redemarrer votre ordinateur
    echo    - Ou ajouter Node.js au PATH systeme
    echo.
    echo    Pour installer Node.js :
    echo.
    echo    1. Allez sur : https://nodejs.org/
    echo    2. Telechargez la version LTS recommandee
    echo    3. Installez en suivant les instructions
    echo    4. IMPORTANT : Cochez "Automatically install necessary tools"
    echo    5. Redemarrez votre ordinateur
    echo    6. Relancez ce script
    echo.
    echo ================================================================
    echo.
    echo [O] Ouvrir nodejs.org
    echo [C] Continuer quand meme si Node.js est installe
    echo [Q] Quitter
    echo.
    set /p CHOICE="Votre choix: "
    if /i "!CHOICE!"=="O" start https://nodejs.org/ & exit
    if /i "!CHOICE!"=="Q" exit
    if /i "!CHOICE!"=="C" goto MENU
    exit
)

:MENU
cls
echo.
echo ================================================================
echo.
echo           WILCO QUIZ v4.0 - MENU PRINCIPAL
echo           SQLite + Avatars + Historique
echo.
if defined NODE_VERSION echo    Node.js %NODE_VERSION% detecte
echo.
echo ================================================================
echo.
echo   INSTALLATION ET CONFIGURATION
echo   ------------------------------
echo   [1] Setup structure du projet
echo   [2] Creer fichiers .env
echo   [3] Installer dependances (npm install)
echo   [7] Verifier structure du projet
echo   [9] Creer fichiers manquants
echo.
echo   DEVELOPPEMENT ET PRODUCTION
echo   ------------------------------
echo   [4] Demarrer mode developpement
echo   [5] Build production (npm run build)
echo   [6] Demarrer mode production
echo.
echo   BASE DE DONNEES
echo   ------------------------------
echo   [11] Reinitialiser la base de donnees
echo   [12] Sauvegarder la base de donnees
echo   [13] Verifier la base de donnees
echo   [14] Migrer JSON vers SQLite (ancien db.json)
echo.
echo   MAINTENANCE
echo   ------------------------------
echo   [8]  Nettoyer projet (node_modules, build)
echo   [10] Reparer npm (problemes d'installation)
echo.
echo   [Q] Quitter
echo.
echo ================================================================
echo.
set /p CHOICE="Votre choix: "

if "%CHOICE%"=="1" call 1-setup-structure.bat & pause & goto MENU
if "%CHOICE%"=="2" call 2-create-env.bat & pause & goto MENU
if "%CHOICE%"=="3" call 3-install.bat & goto MENU
if "%CHOICE%"=="4" call 4-start-dev.bat & goto MENU
if "%CHOICE%"=="5" call 5-deploy-prod.bat & goto MENU
if "%CHOICE%"=="6" call 6-start-prod.bat & goto MENU
if "%CHOICE%"=="7" call 7-check-structure.bat & pause & goto MENU
if "%CHOICE%"=="8" call 8-clean.bat & goto MENU
if "%CHOICE%"=="9" call 9-create-missing-files.bat & pause & goto MENU
if "%CHOICE%"=="10" call 10-fix-npm.bat & goto MENU
if "%CHOICE%"=="11" call 11-reset-database.bat & goto MENU
if "%CHOICE%"=="12" call 12-backup-database.bat & goto MENU
if "%CHOICE%"=="13" call 13-check-database.bat & pause & goto MENU
if "%CHOICE%"=="14" call 14-migrate-to-sqlite.bat & goto MENU
if /i "%CHOICE%"=="Q" exit
if /i "%CHOICE%"=="q" exit

echo.
echo Choix invalide. Veuillez entrer un numero du menu.
timeout /t 2 /nobreak >nul
goto MENU