REM ===============================================
REM 4-start-dev.bat
REM Demarrer en mode developpement
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    MODE DEVELOPPEMENT
echo ================================================
echo.
echo Demarrage des serveurs...
echo.

echo Serveur API (port 3001)
start "Wilco Quiz - Serveur API" cmd /k "cd server && echo. && echo === SERVEUR API - PORT 3001 === && echo. && node server.js"

timeout /t 3 /nobreak >nul

echo Client React (port 3000)
start "Wilco Quiz - Client React" cmd /k "cd client && echo. && echo === CLIENT REACT - PORT 3000 === && echo. && npm start"

echo.
echo ================================================
echo    SERVEURS DEMARRES !
echo ================================================
echo.
echo Acces:
echo    - Client React: http://localhost:3000
echo    - API Server:   http://localhost:3001
echo.
echo Conseils:
echo    - Les deux fenetres doivent rester ouvertes
echo    - Le client React s'ouvrira automatiquement
echo    - Modifiez le code et sauvegardez pour hot-reload
echo.
echo Fermez cette fenetre ou appuyez sur une touche...
pause >nul
