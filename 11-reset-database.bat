@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   🗑️  RÉINITIALISER LA BASE DE DONNÉES  ║
echo ╚══════════════════════════════════════════╝
echo.
echo ⚠️  ATTENTION: Cette action va:
echo    - Supprimer tous les quiz
echo    - Supprimer toutes les questions
echo    - Supprimer tous les participants
echo    - Supprimer toutes les équipes
echo    - Supprimer tous les lobbies
echo    - Réinitialiser les scores
echo.
echo Le compte admin sera conservé (admin/admin123)
echo.
set /p CONFIRM="Êtes-vous sûr ? (O/N): "
if /i not "%CONFIRM%"=="O" (
    echo Opération annulée.
    pause
    exit /b 0
)

echo.
echo 🗑️  Suppression de db.json...
if exist "server\db.json" (
    del /q "server\db.json"
    echo    ✓ db.json supprimé
) else (
    echo    ℹ️  db.json n'existe pas
)

echo.
echo ✅ Base de données réinitialisée !
echo.
echo 👉 Au prochain démarrage du serveur,
echo    un nouveau db.json sera créé automatiquement.
echo.
echo Pour démarrer le serveur:
echo    6-start-prod.bat (production)
echo    ou
echo    4-start-dev.bat (développement)
echo.
pause