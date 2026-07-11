@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_URL=http://localhost:7000"
set "FRONTEND_URL=http://localhost:5173"
set "ENV_FILE=%BACKEND_DIR%\compose\local.env"
set "VENV_DIR=%BACKEND_DIR%\.venv"
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"

echo ================================
echo      INICIANDO PROYECTO
echo ================================

echo.
echo === Validando herramientas ===
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado o no esta en el PATH.
  echo Instala Node.js 22 LTS y vuelve a ejecutar START.bat.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm no esta instalado o no esta en el PATH.
  echo Reinstala Node.js 22 LTS marcando la opcion de agregarlo al PATH.
  pause
  exit /b 1
)

where py >nul 2>nul
if errorlevel 1 (
  where python >nul 2>nul
  if errorlevel 1 (
    echo ERROR: Python no esta instalado o no esta en el PATH.
    echo Instala Python 3.13.x marcando "Add python.exe to PATH".
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

echo Cargando configuracion local...
for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
  set "%%A=%%B"
)

if not exist "%VENV_PYTHON%" (
  echo Creando entorno virtual backend...
  %PYTHON_CMD% -m venv --copies "%VENV_DIR%"
  if errorlevel 1 (
    echo ERROR: No se pudo crear el entorno virtual.
    echo Si aparece WinError 5, ejecuta START.bat como administrador una vez.
    pause
    exit /b 1
  )
)

if exist "%VENV_DIR%\pyvenv.cfg" (
  findstr /i /c:"Inventario_planchas" "%VENV_DIR%\pyvenv.cfg" >nul 2>nul
  if not errorlevel 1 (
    echo ERROR: El entorno virtual backend\.venv apunta a otro proyecto.
    echo Borra la carpeta backend\.venv y vuelve a ejecutar START.bat.
    pause
    exit /b 1
  )
)

call "%VENV_DIR%\Scripts\activate"
set "PIP_REQUIRE_VIRTUALENV=true"

if /i "%USE_SQLITE%"=="1" (
  echo Usando SQLite local. No se requiere PostgreSQL.
) else (
  call :PreparePostgres
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

echo Instalando dependencias backend...
"%VENV_PYTHON%" -m pip install -r requirements.txt
if errorlevel 1 (
  echo ERROR: Fallo la instalacion de dependencias backend.
  echo Revisa la conexion a internet y que el antivirus no bloquee backend\.venv.
  pause
  exit /b 1
)

echo Ejecutando migraciones...
"%VENV_PYTHON%" manage.py migrate
if errorlevel 1 (
  echo ERROR: No se pudieron aplicar las migraciones.
  echo Verifica que PostgreSQL acepte el usuario y password configurados en backend\compose\local.env.
  pause
  exit /b 1
)

start "Django Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && call .venv\Scripts\activate && ""%VENV_PYTHON%"" manage.py runserver 7000"

REM ---------- FRONTEND ----------
echo.
echo === Frontend React ===
cd /d "%FRONTEND_DIR%"

if not exist "node_modules" (
  echo Instalando dependencias frontend...
  npm install
  if errorlevel 1 (
    echo ERROR: Fallo la instalacion de dependencias frontend.
    echo Revisa la conexion a internet y vuelve a ejecutar START.bat.
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
exit /b 0

:PreparePostgres
echo.
echo === PostgreSQL local ===
call :FindPostgresTools

echo Verificando conexion a PostgreSQL en %POSTGRES_HOST%:%POSTGRES_PORT%...
call :WaitForPostgres 2
if not errorlevel 1 goto :EnsureDatabase

echo PostgreSQL no responde. Intentando iniciar el servicio...
call :StartPostgresService

call :WaitForPostgres 20
if errorlevel 1 (
  echo ERROR: PostgreSQL no pudo iniciarse automaticamente.
  echo Abre "Servicios" de Windows e inicia el servicio PostgreSQL, o ejecuta START.bat como administrador.
  echo Configuracion actual: host=%POSTGRES_HOST% puerto=%POSTGRES_PORT% db=%POSTGRES_DB% usuario=%POSTGRES_USER%
  exit /b 1
)

:EnsureDatabase
where psql >nul 2>nul
if errorlevel 1 (
  echo Aviso: No encontre psql en el PATH. Continuare con las migraciones.
  echo Si la base "%POSTGRES_DB%" no existe, creala en PostgreSQL o agrega PostgreSQL\bin al PATH.
  exit /b 0
)

set "PGPASSWORD=%POSTGRES_PASSWORD%"
set "DB_EXISTS="
for /f %%D in ('psql -h "%POSTGRES_HOST%" -p "%POSTGRES_PORT%" -U "%POSTGRES_USER%" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='%POSTGRES_DB%';" 2^>nul') do set "DB_EXISTS=%%D"

if "%DB_EXISTS%"=="1" (
  echo Base de datos "%POSTGRES_DB%" lista.
  exit /b 0
)

echo Creando base de datos "%POSTGRES_DB%"...
createdb -h "%POSTGRES_HOST%" -p "%POSTGRES_PORT%" -U "%POSTGRES_USER%" "%POSTGRES_DB%" >nul 2>nul
if errorlevel 1 (
  echo ERROR: PostgreSQL responde, pero no pude crear la base "%POSTGRES_DB%".
  echo Revisa usuario/password en backend\compose\local.env o crea la base manualmente.
  exit /b 1
)

echo Base de datos "%POSTGRES_DB%" creada.
exit /b 0

:FindPostgresTools
where psql >nul 2>nul
if not errorlevel 1 exit /b 0

for /d %%D in ("%ProgramFiles%\PostgreSQL\*") do (
  if exist "%%~fD\bin\psql.exe" (
    set "PATH=%%~fD\bin;%PATH%"
    exit /b 0
  )
)

exit /b 0

:StartPostgresService
set "PG_SERVICE="
for %%S in (postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql-x64-14 postgresql-x64-13 postgresql-x64-12 postgresql-x64-11) do (
  sc query "%%S" >nul 2>nul
  if not errorlevel 1 (
    if not defined PG_SERVICE set "PG_SERVICE=%%S"
  )
)

if defined PG_SERVICE (
  net start "%PG_SERVICE%" >nul 2>nul
  exit /b 0
)

exit /b 0

:WaitForPostgres
set "MAX_TRIES=%~1"
if "%MAX_TRIES%"=="" set "MAX_TRIES=20"

for /l %%I in (1,1,%MAX_TRIES%) do (
  "%VENV_PYTHON%" -c "import socket,sys; s=socket.socket(); s.settimeout(1); sys.exit(0 if s.connect_ex(('%POSTGRES_HOST%', int('%POSTGRES_PORT%')))==0 else 1)" >nul 2>nul
  if not errorlevel 1 exit /b 0
  timeout /t 2 /nobreak >nul
)

exit /b 1
