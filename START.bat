@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_URL=http://localhost:7000"
set "FRONTEND_URL=http://localhost:5173"
set "ENV_FILE=%BACKEND_DIR%\compose\local.env"

echo ================================
echo      INICIANDO PROYECTO
echo ================================

echo.
echo === Validando herramientas ===
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado o no esta en el PATH.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm no esta instalado o no esta en el PATH.
  pause
  exit /b 1
)

where py >nul 2>nul
if errorlevel 1 (
  where python >nul 2>nul
  if errorlevel 1 (
    echo ERROR: Python no esta instalado o no esta en el PATH.
    pause
    exit /b 1
  )
  set "PYTHON_CMD=python"
) else (
  set "PYTHON_CMD=py -3"
)

REM ---------- BACKEND ----------
echo.
echo === Backend Django ===
cd /d "%BACKEND_DIR%"

if not exist "%ENV_FILE%" (
  echo ERROR: No existe "%ENV_FILE%".
  pause
  exit /b 1
)

echo Cargando variables desde backend\compose\local.env...
for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
  set "%%A=%%B"
)

if not exist ".venv\Scripts\python.exe" (
  echo Creando entorno virtual backend...
  %PYTHON_CMD% -m venv .venv
  if errorlevel 1 (
    echo ERROR: No se pudo crear el entorno virtual.
    pause
    exit /b 1
  )
)

call .venv\Scripts\activate

echo Instalando dependencias backend...
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo ERROR: Fallo la instalacion de dependencias backend.
  pause
  exit /b 1
)

echo Ejecutando migraciones...
python manage.py migrate
if errorlevel 1 (
  echo ERROR: Fallaron las migraciones. Revisa que PostgreSQL este iniciado y que backend\compose\local.env tenga los datos correctos.
  pause
  exit /b 1
)

start "Django Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && call .venv\Scripts\activate && python manage.py runserver 7000"

REM ---------- FRONTEND ----------
echo.
echo === Frontend React ===
cd /d "%FRONTEND_DIR%"

if not exist "node_modules" (
  echo Instalando dependencias frontend...
  npm install
  if errorlevel 1 (
    echo ERROR: Fallo la instalacion de dependencias frontend.
    pause
    exit /b 1
  )
)

start "React Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev -- --host 0.0.0.0"

echo Esperando a que levanten los servicios...
timeout /t 5 /nobreak >nul
start "" "%FRONTEND_URL%"

echo.
echo ================================
echo Proyecto iniciado correctamente
echo Backend: %BACKEND_URL%
echo Frontend: %FRONTEND_URL%
echo ================================
pause
