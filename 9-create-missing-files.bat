REM ===============================================
REM 9-create-missing-files.bat
REM Pour creer les fichiers manquants
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    CREATION DES FICHIERS MANQUANTS
echo ================================================
echo.
echo Ce script va creer des fichiers vides pour tous
echo les composants qui n'existent pas encore.
echo.
echo ATTENTION: Vous devrez ensuite copier le contenu
echo depuis les artifacts fournis.
echo.
pause

cd client\src

REM Creer les dossiers
if not exist "components" mkdir components
if not exist "services" mkdir services
if not exist "hooks" mkdir hooks
if not exist "utils" mkdir utils

echo.
echo Creation des fichiers...
echo.

REM Composants
set COMPONENTS=AdminDashboard QuestionBank QuizEditor ParticipantManager LobbyManager LiveMonitoring ValidationView QuizResultsView ScoreboardView LoginView LobbyView LobbyViewList QuizView ReconnectingScreen ToastProvider DarkModeToggle

for %%C in (%COMPONENTS%) do (
    if not exist "components\%%C.jsx" (
        echo    Creation components\%%C.jsx
        echo // TODO: Copier le contenu de %%C > "components\%%C.jsx"
    ) else (
        echo    [EXISTE] components\%%C.jsx
    )
)

REM Services
if not exist "services\api.js" (
    echo    Creation services\api.js
    echo // TODO: Copier le contenu de api.js > "services\api.js"
) else (
    echo    [EXISTE] services\api.js
)

if not exist "services\storage.js" (
    echo    Creation services\storage.js
    echo // TODO: Copier le contenu de storage.js > "services\storage.js"
) else (
    echo    [EXISTE] services\storage.js
)

REM Hooks
if not exist "hooks\useQuizData.js" (
    echo    Creation hooks\useQuizData.js
    echo // TODO: Copier le contenu de useQuizData.js > "hooks\useQuizData.js"
) else (
    echo    [EXISTE] hooks\useQuizData.js
)

REM Utils
if not exist "utils\helpers.js" (
    echo    Creation utils\helpers.js
    echo // TODO: Copier le contenu de helpers.js > "utils\helpers.js"
) else (
    echo    [EXISTE] utils\helpers.js
)

cd ..\..

echo.
echo ================================================
echo    FICHIERS CREES !
echo ================================================
echo.
echo N'oubliez pas de copier le contenu reel dans
echo chaque fichier cree.
echo.
pause
