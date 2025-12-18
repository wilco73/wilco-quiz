@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    SAUVEGARDER LA BASE DE DONNEES
echo ================================================
echo.

if not exist "server\quiz.db" (
    echo [ERREUR] quiz.db introuvable
    echo    Le serveur n'a peut-etre pas encore ete demarre
    pause
    exit /b 1
)

echo Lancement de la sauvegarde...
echo.
cd server
call npm run backup
cd ..

echo.
pause
