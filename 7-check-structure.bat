REM ===============================================
REM 7-check-structure.bat
REM ===============================================
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo.
echo ================================================
echo    VERIFICATION DE LA STRUCTURE
echo ================================================
echo.

set ERROR_COUNT=0

echo Verification des dossiers...
echo.

REM Verifier client/src/components
if exist "client\src\components" (
    echo [OK] client\src\components
) else (
    echo [X] client\src\components MANQUANT
    set /a ERROR_COUNT+=1
)

REM Verifier client/src/services
if exist "client\src\services" (
    echo [OK] client\src\services
) else (
    echo [X] client\src\services MANQUANT
    set /a ERROR_COUNT+=1
)

REM Verifier client/src/hooks
if exist "client\src\hooks" (
    echo [OK] client\src\hooks
) else (
    echo [X] client\src\hooks MANQUANT
    set /a ERROR_COUNT+=1
)

REM Verifier client/src/utils
if exist "client\src\utils" (
    echo [OK] client\src\utils
) else (
    echo [X] client\src\utils MANQUANT
    set /a ERROR_COUNT+=1
)

REM Verifier server
if exist "server" (
    echo [OK] server
) else (
    echo [X] server MANQUANT
    set /a ERROR_COUNT+=1
)

echo.
echo Verification des fichiers principaux...
echo.

REM Fichiers serveur
if exist "server\server.js" (
    echo [OK] server\server.js
) else (
    echo [X] server\server.js MANQUANT
    set /a ERROR_COUNT+=1
)

if exist "server\database.js" (
    echo [OK] server\database.js
) else (
    echo [X] server\database.js MANQUANT
    set /a ERROR_COUNT+=1
)

if exist "server\package.json" (
    echo [OK] server\package.json
) else (
    echo [X] server\package.json MANQUANT
    set /a ERROR_COUNT+=1
)

REM Fichiers client
if exist "client\src\App.js" (
    echo [OK] client\src\App.js
) else (
    echo [X] client\src\App.js MANQUANT
    set /a ERROR_COUNT+=1
)

if exist "client\src\config.js" (
    echo [OK] client\src\config.js
) else (
    echo [X] client\src\config.js MANQUANT
    set /a ERROR_COUNT+=1
)

if exist "client\src\services\api.js" (
    echo [OK] client\src\services\api.js
) else (
    echo [X] client\src\services\api.js MANQUANT
    set /a ERROR_COUNT+=1
)

echo.
echo ================================================

if %ERROR_COUNT% EQU 0 (
    echo    TOUT EST OK !
) else (
    echo    %ERROR_COUNT% PROBLEME(S) DETECTE(S)
    echo.
    echo    Executez 9-create-missing-files.bat pour creer
    echo    les fichiers manquants.
)

echo ================================================
echo.
pause
