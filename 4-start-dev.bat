REM ===============================================
REM 4-start-dev.bat
REM Démarrer en mode développement
REM ===============================================
@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   🔧 MODE DÉVELOPPEMENT                  ║
echo ╚══════════════════════════════════════════╝
echo.
echo Démarrage des serveurs...
echo.

echo 🔌 Serveur API (port 3001)
start "Wilco Quiz - Serveur API" cmd /k "cd server && echo. && echo ╔═══════════════════════════╗ && echo ║   SERVEUR API - PORT 3001 ║ && echo ╚═══════════════════════════╝ && echo. && node server.js"

timeout /t 3 /nobreak >nul

echo ⚛️  Client React (port 3000)
start "Wilco Quiz - Client React" cmd /k "cd client && echo. && echo ╔═══════════════════════════════╗ && echo ║   CLIENT REACT - PORT 3000    ║ && echo ╚═══════════════════════════════╝ && echo. && npm start"

echo.
echo ✅ Serveurs démarrés dans des fenêtres séparées !
echo.
echo 📡 Accès:
echo    - Client React: http://localhost:3000
echo    - API Server:   http://localhost:3001
echo.
echo 💡 Conseils:
echo    - Le client s'ouvrira automatiquement dans votre navigateur
echo    - Fermez les fenêtres pour arrêter les serveurs
echo    - Ou appuyez sur Ctrl+C dans chaque fenêtre
echo.
pause