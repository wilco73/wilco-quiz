REM ===============================================
REM 0-MASTER.bat
REM Menu principal pour tout gérer
REM ===============================================
@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:MENU
cls
echo.
echo ================================================================
echo.
echo           WILCO QUIZ v2.0 - MENU PRINCIPAL
echo                   (SQLite Edition)
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