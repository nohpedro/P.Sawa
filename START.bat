@echo off
setlocal

echo ================================
echo      INICIANDO PROYECTO
echo ================================

REM ---------- BACKEND ----------
echo.
echo === Backend Django ===
cd /d "%~dp0backend"

REM activar entorno virtual existente
call .venv\Scripts\activate

echo Instalando dependencias backend...
pip install -r requirements.txt

echo Ejecutando migraciones...
python manage.py migrate

start "Django Backend" cmd /k "python manage.py runserver 7000"

REM ---------- FRONTEND ----------
echo.
echo === Frontend React ===
cd /d "%~dp0frontend"

if not exist "node_modules" (
  echo Instalando dependencias frontend...
  npm install
)

start "React Frontend" cmd /k "npm run dev"

echo.
echo ================================
echo Proyecto iniciado correctamente
echo Backend: http://localhost:7000
echo Frontend: http://localhost:5173
echo ================================
pause
