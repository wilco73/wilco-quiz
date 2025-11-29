REM ===============================================
REM 1-setup-structure.bat (VERSION CORRIGÉE)
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   🔧 SETUP STRUCTURE DU PROJET          ║
echo ╚══════════════════════════════════════════╝
echo.

REM Vérifier qu'on est à la racine
if not exist "client\src" (
    echo ❌ Erreur: Dossier client\src introuvable
    echo    Exécutez ce script depuis la racine du projet
    pause
    exit /b 1
)

cd client\src

echo 📁 Création des dossiers...
if not exist "components" mkdir components
if not exist "services" mkdir services
if not exist "hooks" mkdir hooks
if not exist "utils" mkdir utils
echo    ✓ Dossiers créés
echo.

echo 📦 Vérification et déplacement des composants...

REM AdminDashboard.jsx
if exist "AdminDashboard.jsx" (
    move /Y "AdminDashboard.jsx" "components\AdminDashboard.jsx" >nul 2>&1
    echo    ✓ AdminDashboard.jsx
) else if exist "components\AdminDashboard.jsx" (
    echo    ✓ AdminDashboard.jsx ^(déjà en place^)
) else (
    echo    ✗ AdminDashboard.jsx MANQUANT
)

REM LiveMonitoring.jsx
if exist "LiveMonitoring.jsx" (
    move /Y "LiveMonitoring.jsx" "components\LiveMonitoring.jsx" >nul 2>&1
    echo    ✓ LiveMonitoring.jsx
) else if exist "components\LiveMonitoring.jsx" (
    echo    ✓ LiveMonitoring.jsx ^(déjà en place^)
) else (
    echo    ✗ LiveMonitoring.jsx MANQUANT
)

REM ValidationView.jsx
if exist "ValidationView.jsx" (
    move /Y "ValidationView.jsx" "components\ValidationView.jsx" >nul 2>&1
    echo    ✓ ValidationView.jsx
) else if exist "components\ValidationView.jsx" (
    echo    ✓ ValidationView.jsx ^(déjà en place^)
) else (
    echo    ✗ ValidationView.jsx MANQUANT
)

REM LobbyManager.jsx
if exist "LobbyManager.jsx" (
    move /Y "LobbyManager.jsx" "components\LobbyManager.jsx" >nul 2>&1
    echo    ✓ LobbyManager.jsx
) else if exist "components\LobbyManager.jsx" (
    echo    ✓ LobbyManager.jsx ^(déjà en place^)
) else (
    echo    ✗ LobbyManager.jsx MANQUANT
)

REM QuestionBank.jsx
if exist "QuestionBank.jsx" (
    move /Y "QuestionBank.jsx" "components\QuestionBank.jsx" >nul 2>&1
    echo    ✓ QuestionBank.jsx
) else if exist "components\QuestionBank.jsx" (
    echo    ✓ QuestionBank.jsx ^(déjà en place^)
) else (
    echo    ✗ QuestionBank.jsx MANQUANT
)

REM QuizEditor.jsx
if exist "QuizEditor.jsx" (
    move /Y "QuizEditor.jsx" "components\QuizEditor.jsx" >nul 2>&1
    echo    ✓ QuizEditor.jsx
) else if exist "components\QuizEditor.jsx" (
    echo    ✓ QuizEditor.jsx ^(déjà en place^)
) else (
    echo    ✗ QuizEditor.jsx MANQUANT
)

REM LoginView.jsx
if exist "LoginView.jsx" (
    move /Y "LoginView.jsx" "components\LoginView.jsx" >nul 2>&1
    echo    ✓ LoginView.jsx
) else if exist "components\LoginView.jsx" (
    echo    ✓ LoginView.jsx ^(déjà en place^)
) else (
    echo    ✗ LoginView.jsx MANQUANT
)

REM LobbyViewList.jsx
if exist "LobbyViewList.jsx" (
    move /Y "LobbyViewList.jsx" "components\LobbyViewList.jsx" >nul 2>&1
    echo    ✓ LobbyViewList.jsx
) else if exist "components\LobbyViewList.jsx" (
    echo    ✓ LobbyViewList.jsx ^(déjà en place^)
) else (
    echo    ✗ LobbyViewList.jsx MANQUANT
)

REM LobbyView.jsx
if exist "LobbyView.jsx" (
    move /Y "LobbyView.jsx" "components\LobbyView.jsx" >nul 2>&1
    echo    ✓ LobbyView.jsx
) else if exist "components\LobbyView.jsx" (
    echo    ✓ LobbyView.jsx ^(déjà en place^)
) else (
    echo    ✗ LobbyView.jsx MANQUANT
)

REM QuizView.jsx
if exist "QuizView.jsx" (
    move /Y "QuizView.jsx" "components\QuizView.jsx" >nul 2>&1
    echo    ✓ QuizView.jsx
) else if exist "components\QuizView.jsx" (
    echo    ✓ QuizView.jsx ^(déjà en place^)
) else (
    echo    ✗ QuizView.jsx MANQUANT
)

echo.
echo 📦 Vérification et déplacement des services...

REM api.js
if exist "api.js" (
    move /Y "api.js" "services\api.js" >nul 2>&1
    echo    ✓ api.js
) else if exist "services\api.js" (
    echo    ✓ api.js ^(déjà en place^)
) else (
    echo    ✗ api.js MANQUANT
)

REM storage.js
if exist "storage.js" (
    move /Y "storage.js" "services\storage.js" >nul 2>&1
    echo    ✓ storage.js
) else if exist "services\storage.js" (
    echo    ✓ storage.js ^(déjà en place^)
) else (
    echo    ✗ storage.js MANQUANT
)

echo.
echo 📦 Vérification et déplacement des hooks...

REM useQuizData.js
if exist "useQuizData.js" (
    move /Y "useQuizData.js" "hooks\useQuizData.js" >nul 2>&1
    echo    ✓ useQuizData.js
) else if exist "hooks\useQuizData.js" (
    echo    ✓ useQuizData.js ^(déjà en place^)
) else (
    echo    ✗ useQuizData.js MANQUANT
)

echo.
echo 📦 Vérification et déplacement des utils...

REM helpers.js
if exist "helpers.js" (
    move /Y "helpers.js" "utils\helpers.js" >nul 2>&1
    echo    ✓ helpers.js
) else if exist "utils\helpers.js" (
    echo    ✓ helpers.js ^(déjà en place^)
) else (
    echo    ✗ helpers.js MANQUANT
)

cd ..\..

echo.
echo ═══════════════════════════════════════════
echo ✅ Organisation terminée !
echo.
echo 📁 Structure créée dans client\src\:
echo    - components\ (10 fichiers)
echo    - services\   (2 fichiers)
echo    - hooks\      (1 fichier)
echo    - utils\      (1 fichier)
echo.
echo 👉 Étape suivante: Exécutez 7-check-structure.bat
echo    pour vérifier que tout est en place
echo.
pause