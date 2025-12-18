@echo off
chcp 65001 >nul
echo.
echo ================================================
echo    DIAGNOSTIC BASE DE DONNEES
echo ================================================
echo.

if not exist "server\quiz.db" (
    echo [ERREUR] quiz.db n'existe pas encore
    echo.
    echo La base sera creee au premier demarrage du serveur
    echo    Executez: 6-start-prod.bat ou 4-start-dev.bat
    echo.
    if exist "server\db.json" (
        echo [INFO] Un ancien fichier db.json a ete detecte !
        echo    Executez 14-migrate-to-sqlite.bat pour migrer vos donnees.
    )
    pause
    exit /b 0
)

echo [OK] quiz.db existe
echo.

REM Afficher la taille du fichier
for %%A in (server\quiz.db) do (
    echo Taille: %%~zA octets
)
echo.

REM Verifier si sqlite3 est disponible pour des stats detaillees
where sqlite3 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Statistiques detaillees:
    echo.
    echo Admins:
    sqlite3 server\quiz.db "SELECT COUNT(*) || ' admin(s)' FROM admins;"
    echo.
    echo Equipes:
    sqlite3 server\quiz.db "SELECT COUNT(*) || ' equipe(s)' FROM teams;"
    echo.
    echo Participants:
    sqlite3 server\quiz.db "SELECT COUNT(*) || ' participant(s)' FROM participants;"
    echo.
    echo Questions:
    sqlite3 server\quiz.db "SELECT COUNT(*) || ' question(s)' FROM questions;"
    echo.
    echo Quiz:
    sqlite3 server\quiz.db "SELECT COUNT(*) || ' quiz' FROM quizzes;"
    echo.
    echo Lobbies:
    sqlite3 server\quiz.db "SELECT COUNT(*) || ' lobby(s)' FROM lobbies;"
) else (
    echo [INFO] sqlite3 non installe - statistiques detaillees non disponibles
    echo    Installez SQLite CLI pour voir les statistiques.
    echo.
    echo    La base de donnees est fonctionnelle, le serveur peut la lire.
)

echo.
echo ================================================
echo.

REM Verifier les fichiers WAL
if exist "server\quiz.db-wal" (
    echo [INFO] Fichier WAL detecte (quiz.db-wal)
    echo    C'est normal si le serveur est en cours d'execution.
    echo.
)

pause
