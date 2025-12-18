@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    MIGRATION JSON vers SQLite
echo ================================================
echo.
echo Ce script va migrer vos donnees de db.json vers SQLite.
echo.
echo IMPORTANT:
echo    - Une sauvegarde de db.json sera creee automatiquement
echo    - Les mots de passe seront hashes (plus de stockage en clair!)
echo    - Toutes vos donnees seront preservees
echo.

if not exist "server\db.json" (
    echo [INFO] Pas de fichier db.json trouve.
    echo    Rien a migrer - la base SQLite sera creee au demarrage.
    echo.
    pause
    exit /b 0
)

set /p CONFIRM="Voulez-vous lancer la migration ? (O/N): "
if /i not "%CONFIRM%"=="O" (
    echo Operation annulee.
    pause
    exit /b 0
)

echo.
echo Lancement de la migration...
echo.
cd server
call npm run migrate
cd ..

echo.
echo ================================================
echo    MIGRATION TERMINEE !
echo ================================================
echo.
echo Vous pouvez maintenant demarrer le serveur avec:
echo    4-start-dev.bat (developpement)
echo    ou
echo    6-start-prod.bat (production)
echo.
pause
