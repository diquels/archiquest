@echo off
echo ====================================
echo Configuration Git pour ArchiQuest
echo ====================================
echo.

REM Initialiser le repository Git
git init

REM Ajouter tous les fichiers
git add .

REM Créer le premier commit
git commit -m "Initial commit: ArchiQuest application"

REM Ajouter le repository distant
git remote add origin https://github.com/diquels/archiquest.git

REM Définir la branche principale
git branch -M main

REM Pousser vers GitHub
git push -u origin main

echo.
echo ====================================
echo Push terminé !
echo ====================================
pause
