REM ===============================================
REM 0-MASTER.bat
REM Menu principal pour tout gérer
REM ===============================================
@echo off
chcp 65001 >nul

:MENU
cls
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║                                                      ║
echo ║          🎮 WILCO QUIZ - MENU PRINCIPAL 🎮          ║
echo ║                                                      ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo  📋 INSTALLATION ET CONFIGURATION
echo  ═══════════════════════════════════
echo  [1] Setup structure du projet
echo  [2] Créer fichiers .env
echo  [3] Installer dépendances
echo  [7] Vérifier structure
echo.
echo  🚀 DÉVELOPPEMENT ET PRODUCTION
echo  ═══════════════════════════════════
echo  [4] Démarrer mode développement
echo  [5] Build production
echo  [6] Démarrer mode production
echo.
echo  🧹 MAINTENANCE
echo  ═══════════════════════════════════
echo  [8] Nettoyer projet
echo.
echo  [Q] Quitter
echo.
echo ════════════════════════════════════════════════════════
echo.
set /p CHOICE="Votre choix: "

if /i "%CHOICE%"=="1" call 1-setup-structure.bat & goto MENU
if /i "%CHOICE%"=="2" call 2-create-env.bat & goto MENU
if /i "%CHOICE%"=="3" call 3-install.bat & goto MENU
if /i "%CHOICE%"=="4" call 4-start-dev.bat & goto MENU
if /i "%CHOICE%"=="5" call 5-deploy-prod.bat & goto MENU
if /i "%CHOICE%"=="6" call 6-start-prod.bat & goto MENU
if /i "%CHOICE%"=="7" call 7-check-structure.bat & goto MENU
if /i "%CHOICE%"=="8" call 8-clean.bat & goto MENU
if /i "%CHOICE%"=="Q" exit

echo.
echo ❌ Choix invalide
timeout /t 2 /nobreak >nul
goto MENU