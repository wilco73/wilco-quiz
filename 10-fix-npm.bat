@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    REPARER NPM INSTALL
echo ================================================
echo.

echo Ce script va:
echo  1. Nettoyer le cache npm
echo  2. Reinitialiser la configuration
echo  3. Supprimer node_modules existants
echo  4. Reinstaller proprement les dependances
echo.
echo Duree estimee: 5-10 minutes
echo.
pause

echo.
echo [1/6] Nettoyage du cache npm...
call npm cache clean --force 2>nul
if errorlevel 1 (
    echo    [!] Avertissement: Le cache n'a pas pu etre nettoye completement
) else (
    echo    [OK] Cache nettoye
)
echo.

echo [2/6] Reinitialisation de la configuration npm...
call npm config set registry https://registry.npmjs.org/
echo    [OK] Registry configure
echo.

echo [3/6] Suppression des node_modules existants...
if exist "client\node_modules" (
    rmdir /s /q "client\node_modules" 2>nul
    echo    [OK] client\node_modules supprime
)
if exist "server\node_modules" (
    rmdir /s /q "server\node_modules" 2>nul
    echo    [OK] server\node_modules supprime
)
echo.

echo [4/6] Suppression des package-lock.json...
if exist "client\package-lock.json" del /q "client\package-lock.json"
if exist "server\package-lock.json" del /q "server\package-lock.json"
echo    [OK] package-lock.json supprimes
echo.

echo [5/6] Installation du serveur...
cd server
call npm install --no-optional
if errorlevel 1 (
    echo    [ERREUR] Erreur lors de l'installation serveur
    cd ..
    pause
    exit /b 1
)
echo    [OK] Serveur installe
cd ..
echo.

echo [6/6] Installation du client...
cd client
call npm install
if errorlevel 1 (
    echo    [ERREUR] Erreur lors de l'installation client
    cd ..
    pause
    exit /b 1
)
echo    [OK] Client installe
cd ..
echo.

echo ================================================
echo    REPARATION TERMINEE !
echo ================================================
echo.
echo Vous pouvez maintenant demarrer l'application:
echo    4-start-dev.bat (developpement)
echo    6-start-prod.bat (production)
echo.
pause
