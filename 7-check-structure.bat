REM ===============================================
REM 7-check-structure.bat (VERSION CORRIGÉE)
REM ===============================================
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo.
echo ╔══════════════════════════════════════════╗
echo ║   🔍 VÉRIFICATION DE LA STRUCTURE        ║
echo ╚══════════════════════════════════════════╝
echo.

set ERROR_COUNT=0

echo Vérification des dossiers...
echo.

REM Vérifier client/src/components
if exist "client\src\components" (
    echo ✓ client\src\components
) else (
    echo ✗ client\src\components MANQUANT
    set /a ERROR_COUNT+=1
)

REM Vérifier client/src/services
if exist "client\src\services" (
    echo ✓ client\src\services
) else (
    echo ✗ client\src\services MANQUANT
    set /a ERROR_COUNT+=1
)

REM Vérifier client/src/hooks
if exist "client\src\hooks" (
    echo ✓ client\src\hooks
) else (
    echo ✗ client\src\hooks MANQUANT
    set /a ERROR_COUNT+=1
)

REM Vérifier client/src/utils
if exist "client\src\utils" (
    echo ✓ client\src\utils
) else (
    echo ✗ client\src\utils MANQUANT
    set /a ERROR_COUNT+=1
)

echo.
echo Vérification des fichiers clés...
echo.

REM Vérifier App.js
if exist "client\src\App.js" (
    echo ✓ client\src\App.js
) else (
    echo ✗ client\src\App.js MANQUANT
    set /a ERROR_COUNT+=1
)

REM Vérifier config.js
if exist "client\src\config.js" (
    echo ✓ client\src\config.js
) else (
    echo ✗ client\src\config.js MANQUANT
    set /a ERROR_COUNT+=1
)

REM Vérifier server.js
if exist "server\server.js" (
    echo ✓ server\server.js
) else (
    echo ✗ server\server.js MANQUANT
    set /a ERROR_COUNT+=1
)

REM Vérifier .env files
if exist "client\.env.development" (
    echo ✓ client\.env.development
) else (
    echo ⚠ client\.env.development MANQUANT ^(optionnel^)
)

if exist "client\.env.production" (
    echo ✓ client\.env.production
) else (
    echo ⚠ client\.env.production MANQUANT ^(optionnel^)
)

echo.
echo Vérification des composants...
echo.

REM Liste des composants requis
set COMPONENT_COUNT=0
set COMPONENT_FOUND=0

if exist "client\src\components\LoginView.jsx" (
    echo ✓ components\LoginView.jsx
    set /a COMPONENT_FOUND+=1
) else (
    echo ✗ components\LoginView.jsx MANQUANT
    set /a ERROR_COUNT+=1
)
set /a COMPONENT_COUNT+=1

if exist "client\src\components\LobbyViewList.jsx" (
    echo ✓ components\LobbyViewList.jsx
    set /a COMPONENT_FOUND+=1
) else (
    echo ✗ components\LobbyViewList.jsx MANQUANT
    set /a ERROR_COUNT+=1
)
set /a COMPONENT_COUNT+=1

if exist "client\src\components\LobbyView.jsx" (
    echo ✓ components\LobbyView.jsx
    set /a COMPONENT_FOUND+=1
) else (
    echo ✗ components\LobbyView.jsx MANQUANT
    set /a ERROR_COUNT+=1
)
set /a COMPONENT_COUNT+=1

if exist "client\src\components\QuizView.jsx" (
    echo ✓ components\QuizView.jsx
    set /a COMPONENT_FOUND+=1
) else (
    echo ✗ components\QuizView.jsx MANQUANT
    set /a ERROR_COUNT+=1
)
set /a COMPONENT_COUNT+=1

if exist "client\src\components\AdminDashboard.jsx" (
    echo ✓ components\AdminDashboard.jsx
    set /a COMPONENT_FOUND+=1
) else (
    echo ✗ components\AdminDashboard.jsx MANQUANT
    set /a ERROR_COUNT+=1
)
set /a COMPONENT_COUNT+=1

if exist "client\src\components\LiveMonitoring.jsx" (
    echo ✓ components\LiveMonitoring.jsx
    set /a COMPONENT_FOUND+=1
) else (
    echo ✗ components\LiveMonitoring.jsx MANQUANT
    set /a ERROR_COUNT+=1
)
set /a COMPONENT_COUNT+=1

if exist "client\src\components\ValidationView.jsx" (
    echo ✓ components\ValidationView.jsx
    set /a COMPONENT_FOUND+=1
) else (
    echo ✗ components\ValidationView.jsx MANQUANT
    set /a ERROR_COUNT+=1
)
set /a COMPONENT_COUNT+=1

if exist "client\src\components\LobbyManager.jsx" (
    echo ✓ components\LobbyManager.jsx
    set /a COMPONENT_FOUND+=1
) else (
    echo ✗ components\LobbyManager.jsx MANQUANT
    set /a ERROR_COUNT+=1
)
set /a COMPONENT_COUNT+=1

if exist "client\src\components\QuestionBank.jsx" (
    echo ✓ components\QuestionBank.jsx
    set /a COMPONENT_FOUND+=1
) else (
    echo ✗ components\QuestionBank.jsx MANQUANT
    set /a ERROR_COUNT+=1
)
set /a COMPONENT_COUNT+=1

if exist "client\src\components\QuizEditor.jsx" (
    echo ✓ components\QuizEditor.jsx
    set /a COMPONENT_FOUND+=1
) else (
    echo ✗ components\QuizEditor.jsx MANQUANT
    set /a ERROR_COUNT+=1
)
set /a COMPONENT_COUNT+=1

echo.
echo Vérification des services...
echo.

if exist "client\src\services\api.js" (
    echo ✓ services\api.js
) else (
    echo ✗ services\api.js MANQUANT
    set /a ERROR_COUNT+=1
)

if exist "client\src\services\storage.js" (
    echo ✓ services\storage.js
) else (
    echo ✗ services\storage.js MANQUANT
    set /a ERROR_COUNT+=1
)

echo.
echo Vérification des hooks...
echo.

if exist "client\src\hooks\useQuizData.js" (
    echo ✓ hooks\useQuizData.js
) else (
    echo ✗ hooks\useQuizData.js MANQUANT
    set /a ERROR_COUNT+=1
)

echo.
echo Vérification des utils...
echo.

if exist "client\src\utils\helpers.js" (
    echo ✓ utils\helpers.js
) else (
    echo ✗ utils\helpers.js MANQUANT
    set /a ERROR_COUNT+=1
)

echo.
echo ═══════════════════════════════════════════
echo.

if !ERROR_COUNT! EQU 0 (
    echo ✅ Structure correcte ! Tous les fichiers sont présents.
    echo.
    echo 📊 Résumé:
    echo    - Composants: !COMPONENT_FOUND!/!COMPONENT_COUNT!
    echo    - Services: 2/2
    echo    - Hooks: 1/1
    echo    - Utils: 1/1
    echo.
    echo 👉 Vous pouvez maintenant exécuter:
    echo    - 2-create-env.bat ^(si pas encore fait^)
    echo    - 3-install.bat ^(si pas encore fait^)
    echo    - 4-start-dev.bat pour développer
    echo    - 5-deploy-prod.bat pour déployer
) else (
    echo ❌ !ERROR_COUNT! problème^(s^) détecté^(s^)
    echo.
    echo 👉 Actions recommandées:
    echo    1. Vérifiez que tous les fichiers .jsx sont créés
    echo    2. Exécutez à nouveau: 1-setup-structure.bat
    echo    3. Si le problème persiste, créez manuellement les fichiers manquants
)

echo.
pause
endlocal