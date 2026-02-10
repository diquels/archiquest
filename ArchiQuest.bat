@echo off
cd /d "%~dp0"

echo --- Verification de Python ---
set "PY="
where py >nul 2>nul && set "PY=py"
if not defined PY where python >nul 2>nul && set "PY=python"

if not defined PY (
  echo ERREUR : Python n'est pas trouve. Verifiez l'installation.
  pause
  exit /b 1
)

echo Lancement du serveur sur http://127.0.0.1:8000
start "ArchiQuest Server" %PY% -m http.server 8000

echo Attente du demarrage...
timeout /t 2 /nobreak >nul

echo Ouverture de l'application...
start http://127.0.0.1:8000/index.html

exit
