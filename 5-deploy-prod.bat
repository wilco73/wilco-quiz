REM ===============================================
REM 5-deploy-prod.bat
REM Build et deploiement production
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    DEPLOIEMENT PRODUCTION
echo ================================================
echo.

echo Build du client React...
cd client
call npm run build
if errorlevel 1 (
    echo.
    echo [ERREUR] Erreur lors du build du client
    cd ..
    pause
    exit /b 1
)
echo    [OK] Client build avec succes
cd ..
echo.

echo Verification du build...
if not exist "client\build\index.html" (
    echo [ERREUR] Le build n'a pas cree les fichiers attendus
    pause
    exit /b 1
)
echo    [OK] Build verifie
echo.

echo ================================================
echo    BUILD PRODUCTION TERMINE !
echo ================================================
echo.
echo Le dossier client\build contient l'application optimisee.
echo.
echo Pour demarrer en production:
echo    Executez 6-start-prod.bat
echo.
pause
