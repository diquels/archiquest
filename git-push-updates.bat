@echo off
echo ====================================
echo Push des modifications vers GitHub
echo ====================================
echo.

REM Ajouter tous les nouveaux fichiers
git add .

REM Créer un commit avec les fichiers Docker
git commit -m "Add Docker deployment configuration"

REM Pousser vers GitHub
git push origin main

echo.
echo ====================================
echo Push terminé !
echo ====================================
echo.
echo Vous pouvez maintenant cloner sur votre VPS avec:
echo git clone https://github.com/diquels/archiquest.git
echo.
pause
