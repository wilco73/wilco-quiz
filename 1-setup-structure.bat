REM ===============================================
REM 1-setup-structure.bat
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    SETUP STRUCTURE DU PROJET
echo ================================================
echo.

REM Verifier qu'on est a la racine
if not exist "client\src" (
    echo [ERREUR] Dossier client\src introuvable
    echo    Executez ce script depuis la racine du projet
    pause
    exit /b 1
)

cd client\src

echo Creation des dossiers...
if not exist "components" mkdir components
if not exist "services" mkdir services
if not exist "hooks" mkdir hooks
if not exist "utils" mkdir utils
echo    [OK] Dossiers crees
echo.

echo Verification et deplacement des composants...

REM Liste des composants a verifier/deplacer
set COMPONENTS=AdminDashboard QuestionBank QuizEditor ParticipantManager LobbyManager LiveMonitoring ValidationView QuizResultsView ScoreboardView LoginView LobbyView LobbyViewList QuizView ReconnectingScreen ToastProvider DarkModeToggle

for %%C in (%COMPONENTS%) do (
    if exist "%%C.jsx" (
        echo    Deplacement %%C.jsx...
        move /Y "%%C.jsx" "components\" >nul
    ) else if exist "%%C.js" (
        echo    Deplacement %%C.js...
        move /Y "%%C.js" "components\" >nul
    )
)
echo    [OK] Composants verifies
echo.

REM Verifier api.js
echo Verification des services...
if exist "api.js" (
    echo    Deplacement api.js...
    move /Y "api.js" "services\" >nul
)
if exist "storage.js" (
    echo    Deplacement storage.js...
    move /Y "storage.js" "services\" >nul
)
echo    [OK] Services verifies
echo.

REM Verifier hooks
echo Verification des hooks...
if exist "useQuizData.js" (
    echo    Deplacement useQuizData.js...
    move /Y "useQuizData.js" "hooks\" >nul
)
echo    [OK] Hooks verifies
echo.

REM Verifier utils
echo Verification des utils...
if exist "helpers.js" (
    echo    Deplacement helpers.js...
    move /Y "helpers.js" "utils\" >nul
)
echo    [OK] Utils verifies
echo.

cd ..\..

echo ================================================
echo    STRUCTURE TERMINEE !
echo ================================================
echo.
echo Pour verifier: Executez 7-check-structure.bat
echo.
pause
