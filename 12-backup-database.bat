@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   💾 SAUVEGARDER LA BASE DE DONNÉES     ║
echo ╚══════════════════════════════════════════╝
echo.

if not exist "server\db.json" (
    echo ❌ Erreur: db.json introuvable
    echo    Le serveur n'a peut-être pas encore été démarré
    pause
    exit /b 1
)

REM Créer un dossier backups s'il n'existe pas
if not exist "server\backups" mkdir "server\backups"

REM Nom du fichier avec date et heure
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

set BACKUP_FILE=server\backups\db_%TIMESTAMP%.json

echo 💾 Création de la sauvegarde...
copy "server\db.json" "%BACKUP_FILE%" >nul

if errorlevel 1 (
    echo ❌ Erreur lors de la sauvegarde
    pause
    exit /b 1
)

echo    ✓ Sauvegarde créée: %BACKUP_FILE%
echo.
echo 📊 Contenu sauvegardé:
findstr /C:"teams" /C:"participants" /C:"quizzes" /C:"questions" "server\db.json"
echo.
echo ✅ Sauvegarde terminée !
echo.
pause