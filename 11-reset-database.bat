@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    REINITIALISER LA BASE DE DONNEES
echo ================================================
echo.
echo ATTENTION: Cette action va:
echo    - Supprimer tous les quiz
echo    - Supprimer toutes les questions
echo    - Supprimer tous les participants
echo    - Supprimer toutes les equipes
echo    - Supprimer tous les lobbies
echo    - Reinitialiser les scores
echo.
echo Le compte admin sera recree (admin/admin123)
echo.
set /p CONFIRM="Etes-vous sur ? (O/N): "
if /i not "%CONFIRM%"=="O" (
    echo Operation annulee.
    pause
    exit /b 0
)

echo.
echo Sauvegarde de l'ancienne base...
if exist "server\quiz.db" (
    copy /y "server\quiz.db" "server\quiz.db.backup-%date:~-4%%date:~3,2%%date:~0,2%" >nul 2>&1
    echo    [OK] Backup cree
)

echo.
echo Suppression de la base SQLite...
if exist "server\quiz.db" (
    del /q "server\quiz.db"
    echo    [OK] quiz.db supprime
)
if exist "server\quiz.db-wal" (
    del /q "server\quiz.db-wal"
    echo    [OK] quiz.db-wal supprime
)
if exist "server\quiz.db-shm" (
    del /q "server\quiz.db-shm"
    echo    [OK] quiz.db-shm supprime
)

REM Supprimer aussi l'ancien db.json s'il existe
if exist "server\db.json" (
    del /q "server\db.json"
    echo    [OK] Ancien db.json supprime
)

echo.
echo ================================================
echo    BASE DE DONNEES REINITIALISEE !
echo ================================================
echo.
echo Au prochain demarrage du serveur,
echo une nouvelle base SQLite sera creee automatiquement.
echo.
echo Pour demarrer le serveur:
echo    6-start-prod.bat (production)
echo    ou
echo    4-start-dev.bat (developpement)
echo.
pause
