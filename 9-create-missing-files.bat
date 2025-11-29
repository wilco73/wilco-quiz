REM ===============================================
REM 9-create-missing-files.bat (NOUVEAU)
REM Pour créer les fichiers manquants
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   📝 CRÉATION DES FICHIERS MANQUANTS    ║
echo ╚══════════════════════════════════════════╝
echo.
echo Ce script va créer des fichiers vides pour tous
echo les composants qui n'existent pas encore.
echo.
echo ⚠️  Vous devrez ensuite copier le contenu depuis
echo    les artifacts fournis.
echo.
pause

cd client\src

REM Créer les dossiers
if not exist "components" mkdir components
if not exist "services" mkdir services
if not exist "hooks" mkdir hooks
if not exist "utils" mkdir utils

echo 📝 Création des fichiers...
echo.

REM Créer les composants s'ils n'existent pas
if not exist "components\LoginView.jsx" (
    echo import React from 'react'; > components\LoginView.jsx
    echo const LoginView = ^(^) =^> ^<div^>LoginView - À compléter^</div^>; >> components\LoginView.jsx
    echo export default LoginView; >> components\LoginView.jsx
    echo    ✓ LoginView.jsx créé
)

if not exist "components\LobbyViewList.jsx" (
    echo import React from 'react'; > components\LobbyViewList.jsx
    echo const LobbyViewList = ^(^) =^> ^<div^>LobbyViewList - À compléter^</div^>; >> components\LobbyViewList.jsx
    echo export default LobbyViewList; >> components\LobbyViewList.jsx
    echo    ✓ LobbyViewList.jsx créé
)

if not exist "components\LobbyView.jsx" (
    echo import React from 'react'; > components\LobbyView.jsx
    echo const LobbyView = ^(^) =^> ^<div^>LobbyView - À compléter^</div^>; >> components\LobbyView.jsx
    echo export default LobbyView; >> components\LobbyView.jsx
    echo    ✓ LobbyView.jsx créé
)

if not exist "components\QuizView.jsx" (
    echo import React from 'react'; > components\QuizView.jsx
    echo const QuizView = ^(^) =^> ^<div^>QuizView - À compléter^</div^>; >> components\QuizView.jsx
    echo export default QuizView; >> components\QuizView.jsx
    echo    ✓ QuizView.jsx créé
)

if not exist "components\AdminDashboard.jsx" (
    echo import React from 'react'; > components\AdminDashboard.jsx
    echo const AdminDashboard = ^(^) =^> ^<div^>AdminDashboard - À compléter^</div^>; >> components\AdminDashboard.jsx
    echo export default AdminDashboard; >> components\AdminDashboard.jsx
    echo    ✓ AdminDashboard.jsx créé
)

if not exist "components\LiveMonitoring.jsx" (
    echo import React from 'react'; > components\LiveMonitoring.jsx
    echo const LiveMonitoring = ^(^) =^> ^<div^>LiveMonitoring - À compléter^</div^>; >> components\LiveMonitoring.jsx
    echo export default LiveMonitoring; >> components\LiveMonitoring.jsx
    echo    ✓ LiveMonitoring.jsx créé
)

if not exist "components\ValidationView.jsx" (
    echo import React from 'react'; > components\ValidationView.jsx
    echo const ValidationView = ^(^) =^> ^<div^>ValidationView - À compléter^</div^>; >> components\ValidationView.jsx
    echo export default ValidationView; >> components\ValidationView.jsx
    echo    ✓ ValidationView.jsx créé
)

if not exist "components\LobbyManager.jsx" (
    echo import React from 'react'; > components\LobbyManager.jsx
    echo const LobbyManager = ^(^) =^> ^<div^>LobbyManager - À compléter^</div^>; >> components\LobbyManager.jsx
    echo export default LobbyManager; >> components\LobbyManager.jsx
    echo    ✓ LobbyManager.jsx créé
)

if not exist "components\QuestionBank.jsx" (
    echo import React from 'react'; > components\QuestionBank.jsx
    echo const QuestionBank = ^(^) =^> ^<div^>QuestionBank - À compléter^</div^>; >> components\QuestionBank.jsx
    echo export default QuestionBank; >> components\QuestionBank.jsx
    echo    ✓ QuestionBank.jsx créé
)

if not exist "components\QuizEditor.jsx" (
    echo import React from 'react'; > components\QuizEditor.jsx
    echo const QuizEditor = ^(^) =^> ^<div^>QuizEditor - À compléter^</div^>; >> components\QuizEditor.jsx
    echo export default QuizEditor; >> components\QuizEditor.jsx
    echo    ✓ QuizEditor.jsx créé
)

if not exist "services\api.js" (
    echo export const fetchTeams = async ^(^) =^> ^{^}; > services\api.js
    echo    ✓ api.js créé
)

if not exist "services\storage.js" (
    echo export const saveSession = ^(data^) =^> ^{^}; > services\storage.js
    echo    ✓ storage.js créé
)

if not exist "hooks\useQuizData.js" (
    echo import ^{ useState ^} from 'react'; > hooks\useQuizData.js
    echo export const useQuizData = ^(^) =^> ^{^}; >> hooks\useQuizData.js
    echo    ✓ useQuizData.js créé
)

if not exist "utils\helpers.js" (
    echo export const formatDate = ^(timestamp^) =^> ^{^}; > utils\helpers.js
    echo    ✓ helpers.js créé
)

cd ..\..

echo.
echo ═══════════════════════════════════════════
echo ✅ Fichiers créés !
echo.
echo ⚠️  IMPORTANT: Ces fichiers sont des placeholders vides.
echo    Vous devez maintenant copier le contenu complet depuis
echo    les artifacts fournis dans notre conversation.
echo.
echo 👉 Prochaines étapes:
echo    1. Copiez le contenu de chaque fichier depuis les artifacts
echo    2. Exécutez 7-check-structure.bat pour vérifier
echo    3. Exécutez 3-install.bat si pas encore fait
echo    4. Testez avec 4-start-dev.bat
echo.
pause