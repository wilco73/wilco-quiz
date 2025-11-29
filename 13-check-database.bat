@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   🔍 DIAGNOSTIC BASE DE DONNÉES         ║
echo ╚══════════════════════════════════════════╝
echo.

if not exist "server\db.json" (
    echo ❌ db.json n'existe pas encore
    echo.
    echo 👉 Le fichier sera créé au premier démarrage du serveur
    echo    Exécutez: 6-start-prod.bat ou 4-start-dev.bat
    pause
    exit /b 0
)

echo ✅ db.json existe
echo.
echo 📊 Statistiques:
echo.

REM Compter les éléments (approximatif)
findstr /C:"\"id\":" "server\db.json" > nul
if errorlevel 1 (
    echo ⚠️  Le fichier semble vide ou corrompu
) else (
    echo Fichier valide, voici le contenu:
    echo.
    type "server\db.json"
)

echo.
echo ════════════════════════════════════════════
echo.
pause