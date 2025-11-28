@echo off
echo Démarrage de l'application Quiz...
start cmd /k "cd server && npm start"
timeout /t 3
start cmd /k "cd client && npm start -- --port 32770"
echo Application démarrée !