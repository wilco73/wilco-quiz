REM ===============================================
REM 2-create-env.bat
REM Créer les fichiers de configuration
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   📝 CRÉATION FICHIERS .ENV              ║
echo ╚══════════════════════════════════════════╝
echo.

REM Créer .env.development
echo 📄 Création de client\.env.development...
(
echo # Configuration pour le développement local
echo REACT_APP_API_URL=http://localhost:3001/api
echo REACT_APP_POLL_INTERVAL=1000
echo REACT_APP_DEBUG=true
) > client\.env.development
echo    ✓ Créé
echo.

REM Créer .env.production
echo 📄 Création de client\.env.production...
set /p API_URL="Entrez l'URL publique de votre serveur (ex: http://wilco.freeboxos.fr:32769): "
(
echo # Configuration pour la production
echo REACT_APP_API_URL=%API_URL%/api
echo REACT_APP_POLL_INTERVAL=1000
echo REACT_APP_DEBUG=false
) > client\.env.production
echo    ✓ Créé
echo.

echo ✅ Fichiers de configuration créés !
echo.
echo Fichiers créés:
echo    - client\.env.development
echo    - client\.env.production
echo.
echo 👉 Étape suivante: Exécutez 3-install.bat
echo.
pause