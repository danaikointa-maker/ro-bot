@echo off
REM RO Bot Windows Installer v3.0
REM Minimal install → Web Setup Wizard handles the rest
REM Run: install_windows.bat

echo.
echo ============================================
echo  RO Bot Windows Installer v3.0
echo  Web Setup Wizard + Python3 Service
echo ============================================
echo.

REM ===== STEP 1: Node.js =====
echo [1/5] Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do echo   [OK] Node.js %%v
) else (
    echo   [MISSING] Node.js not found!
    echo.
    echo   Install Node.js first:
    echo     winget install OpenJS.NodeJS.LTS
    echo     Or download: https://nodejs.org/
    echo.
    echo   After installing Node.js, run this script again.
    pause
    exit /b 1
)

REM ===== STEP 2: npm install =====
echo [2/5] Installing npm dependencies...
call npm install 2>nul
echo   [OK] npm modules installed

REM ===== STEP 3: Build =====
echo [3/5] Building application...
call npm run build 2>nul
echo   [OK] Build complete

REM ===== STEP 4: Start server =====
echo [4/5] Starting server...
start "RO Bot Server" /min cmd /c "npm run start"
timeout /t 3 /nobreak >nul

REM Check
curl -s -o nul http://localhost:3000/api/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   [OK] Server running
) else (
    echo   [WAIT] Server starting... 
    timeout /t 3 /nobreak >nul
)

REM ===== STEP 5: Open Setup Wizard =====
echo [5/5] Opening Setup Wizard...
echo.
echo ============================================
echo   INSTALLATION COMPLETE
echo ============================================
echo.
echo   Setup Wizard (check tools + create DB):
echo     http://localhost:3000/setup
echo.
echo   Dashboard (after setup):
echo     http://localhost:3000
echo.
echo   Python3 Background Service:
echo     python ro_service.py
echo.
echo   The Web Setup Wizard will:
echo     1. Check Node.js, ADB, Python, DB, etc.
echo     2. Show download links for missing tools
echo     3. Create database (PostgreSQL or MySQL)
echo     4. Show schema apply command
echo ============================================
echo.

REM Open browser
start "" "http://localhost:3000/setup"

REM Offer Python service
set /p PY_START="Start Python background service? [Y/n]: "
if /i "%PY_START%"=="" set PY_START=Y
if /i "%PY_START%"=="Y" (
    where python >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        start "RO Bot Service" /min cmd /c "python ro_service.py"
        echo   [OK] ro_service.py started
    ) else (
        echo   [SKIP] python not found
    )
)

echo.
echo Done! Browser should open Setup Wizard automatically.
pause
