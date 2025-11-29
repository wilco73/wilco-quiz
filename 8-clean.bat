REM ===============================================
REM 8-clean.bat
REM Nettoyer le projet (node_modules, build, etc.)
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   🧹 NETTOYAGE DU PROJET                 ║
echo ╚══════════════════════════════════════════╝
echo.
echo ⚠️  Cette opération va supprimer:
echo    - node_modules (client et serveur)
echo    - client\build
echo    - package-lock.json
echo.
set /p CONFIRM="Êtes-vous sûr ? (O/N): "
if /i not "%CONFIRM%"=="O" (
    echo Opération annulée.
    pause
    exit /b 0
)

echo.
echo 🧹 Nettoyage en cours...
echo.

if exist "client\node_modules" (
    echo    Suppression de client\node_modules...
    rmdir /s /q "client\node_modules"
    echo    ✓ Supprimé
)

if exist "server\node_modules" (
    echo    Suppression de server\node_modules...
    rmdir /s /q "server\node_modules"
    echo    ✓ Supprimé
)

if exist "client\build" (
    echo    Suppression de client\build...
    rmdir /s /q "client\build"
    echo    ✓ Supprimé
)

if exist "client\package-lock.json" (
    echo    Suppression de client\package-lock.json...
    del /q "client\package-lock.json"
    echo    ✓ Supprimé
)

if exist "server\package-lock.json" (
    echo    Suppression de server\package-lock.json...
    del /q "server\package-lock.json"
    echo    ✓ Supprimé
)

echo.
echo ✅ Nettoyage terminé !
echo.
echo 👉 Exécutez 3-install.bat pour réinstaller les dépendances
echo.
pause