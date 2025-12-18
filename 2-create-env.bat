REM ===============================================
REM 2-create-env.bat
REM Creer les fichiers de configuration
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    CREATION FICHIERS .ENV
echo ================================================
echo.

REM Creer .env.development
echo Creation de client\.env.development...
(
echo # Configuration pour le developpement local
echo REACT_APP_API_URL=http://localhost:3001/api
echo REACT_APP_POLL_INTERVAL=1000
echo REACT_APP_DEBUG=true
) > client\.env.development
echo    [OK] Cree
echo.

REM Creer .env.production
echo Creation de client\.env.production...
set /p API_URL="Entrez l'URL publique de votre serveur (ex: http://wilco.freeboxos.fr:32769): "
(
echo # Configuration pour la production
echo REACT_APP_API_URL=%API_URL%/api
echo REACT_APP_POLL_INTERVAL=1000
echo REACT_APP_DEBUG=false
) > client\.env.production
echo    [OK] Cree
echo.

echo ================================================
echo    FICHIERS .ENV CREES !
echo ================================================
echo.
echo Fichiers crees:
echo    - client\.env.development (pour npm start)
echo    - client\.env.production  (pour npm run build)
echo.
pause
