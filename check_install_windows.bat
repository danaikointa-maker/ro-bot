@echo off
setlocal enabledelayedexpansion

REM ========================================
REM RO Bot Windows Pre-Install Checker
REM Checks all tools, downloads missing ones
REM Run as Administrator for best results
REM ========================================

echo.
echo ╔════════════════════════════════════════════════╗
echo ║   RO Bot Windows Pre-Install Checker v2.0     ║
echo ║   Auto-Detect + Download Missing Tools         ║
echo ╚════════════════════════════════════════════════╝
echo.

REM Check if Admin
net session >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Running as Administrator
) else (
    echo [WARN] Not Administrator - some installs may fail
    echo        Right-click this file ^> Run as Administrator
    echo.
)

set "DL_DIR=%~dp0.downloads"
if not exist "%DL_DIR%" mkdir "%DL_DIR%"

set "TOOLS_DIR=%~dp0tools"
if not exist "%TOOLS_DIR%" mkdir "%TOOLS_DIR%"

set "MISSING=0"
set "FOUND=0"

REM ============================================
REM 1. CHECK Node.js
REM ============================================
echo.
echo [1/8] Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
    echo   [OK] Node.js !NODE_VER! found at:
    where node 2>nul | findstr /r ".*" >nul
    for /f "tokens=*" %%p in ('where node 2^>nul') do echo        %%p
    set /a FOUND+=1
) else (
    echo   [MISSING] Node.js not found
    echo   Downloading Node.js v20 LTS...
    
    REM Detect arch
    if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
        set "NODE_ARCH=x64"
    ) else if "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
        set "NODE_ARCH=arm64"
    ) else (
        set "NODE_ARCH=x86"
    )
    
    set "NODE_URL=https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-!NODE_ARCH!.zip"
    set "NODE_ZIP=%DL_DIR%\node-v20.11.0-win-!NODE_ARCH!.zip"
    
    echo   Downloading: !NODE_URL!
    curl -fsSL -o "!NODE_ZIP!" "!NODE_URL!" 2>nul || (
        echo   [FAIL] curl download failed, trying PowerShell...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '!NODE_URL!' -OutFile '!NODE_ZIP!'" 2>nul
    )
    
    if exist "!NODE_ZIP!" (
        echo   Extracting...
        powershell -Command "Expand-Archive -Path '!NODE_ZIP!' -DestinationPath '%TOOLS_DIR%' -Force" 2>nul
        
        REM Add to PATH
        set "NODE_DIR=%TOOLS_DIR%\node-v20.11.0-win-!NODE_ARCH!"
        if exist "!NODE_DIR!\node.exe" (
            echo   [OK] Node.js extracted to: !NODE_DIR!
            echo   Adding to PATH...
            setx PATH "!NODE_DIR!;%PATH%" >nul 2>&1
            set "PATH=!NODE_DIR!;!PATH!"
            node --version 2>nul && echo   [OK] Node.js ready || echo   [WARN] Need to restart terminal
            set /a FOUND+=1
        ) else (
            echo   [FAIL] Extraction failed
            set /a MISSING+=1
        )
    ) else (
        echo   [FAIL] Could not download Node.js
        echo   Please install manually: https://nodejs.org/
        set /a MISSING+=1
    )
)

REM ============================================
REM 2. CHECK npm
REM ============================================
echo.
echo [2/8] Checking npm...
where npm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('npm --version 2^>nul') do echo   [OK] npm v%%v
    set /a FOUND+=1
) else (
    echo   [MISSING] npm not found (comes with Node.js)
    set /a MISSING+=1
)

REM ============================================
REM 3. CHECK ADB
REM ============================================
echo.
echo [3/8] Checking ADB (Android Debug Bridge)...
where adb >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=1,2" %%a in ('adb version 2^>nul') do echo   [OK] %%a %%b
    echo   Devices:
    adb devices 2>nul | findstr /v "List of" | findstr /r ".*" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        adb devices 2>nul | findstr /v "List of"
    ) else (
        echo   No devices connected
    )
    set /a FOUND+=1
) else (
    echo   [MISSING] ADB not found
    echo   Downloading Android Platform Tools...
    
    set "ADB_URL=https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
    set "ADB_ZIP=%DL_DIR%\platform-tools-windows.zip"
    
    echo   Downloading: !ADB_URL!
    curl -fsSL -o "!ADB_ZIP!" "!ADB_URL!" 2>nul || (
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '!ADB_URL!' -OutFile '!ADB_ZIP!'" 2>nul
    )
    
    if exist "!ADB_ZIP!" (
        echo   Extracting to %TOOLS_DIR%...
        powershell -Command "Expand-Archive -Path '!ADB_ZIP!' -DestinationPath '%TOOLS_DIR%' -Force" 2>nul
        
        set "ADB_DIR=%TOOLS_DIR%\platform-tools"
        if exist "!ADB_DIR!\adb.exe" (
            echo   [OK] ADB extracted to: !ADB_DIR!
            echo   Adding to PATH...
            setx PATH "!ADB_DIR!;%PATH%" >nul 2>&1
            set "PATH=!ADB_DIR!;!PATH!"
            
            REM Also copy to system location if admin
            net session >nul 2>&1
            if !ERRORLEVEL! equ 0 (
                echo   Copying to C:\platform-tools...
                if not exist "C:\platform-tools" mkdir "C:\platform-tools"
                xcopy /y /q "!ADB_DIR!\*" "C:\platform-tools\" >nul 2>&1
                setx /M PATH "C:\platform-tools;%PATH%" >nul 2>&1
            )
            
            "!ADB_DIR!\adb.exe" version 2>nul | findstr /r "Android" && echo   [OK] ADB ready
            set /a FOUND+=1
        ) else (
            echo   [FAIL] ADB extraction failed
            set /a MISSING+=1
        )
    ) else (
        echo   [FAIL] Could not download ADB
        echo   Manual: https://developer.android.com/studio/releases/platform-tools
        set /a MISSING+=1
    )
)

REM ============================================
REM 4. CHECK PostgreSQL
REM ============================================
echo.
echo [4/8] Checking PostgreSQL...
where psql >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('psql --version 2^>nul') do echo   [OK] %%v
    set /a FOUND+=1
    set "DB_FOUND=1"
) else (
    REM Check common install paths
    set "PG_FOUND=0"
    for %%d in ("C:\Program Files\PostgreSQL\16\bin" "C:\Program Files\PostgreSQL\15\bin" "C:\Program Files\PostgreSQL\14\bin") do (
        if exist "%%~d\psql.exe" (
            echo   [OK] PostgreSQL found at: %%~d
            set "PG_FOUND=1"
            set "DB_FOUND=1"
            set /a FOUND+=1
        )
    )
    if "!PG_FOUND!"=="0" (
        echo   [MISSING] PostgreSQL not found
        echo   Downloading PostgreSQL 16 installer...
        
        set "PG_URL=https://get.enterprisedb.com/postgresql/postgresql-16.1-1-windows-x64.exe"
        set "PG_INSTALLER=%DL_DIR%\postgresql-16-windows-x64.exe"
        
        echo   Downloading: !PG_URL!
        echo   NOTE: This is a ~200MB download. Skipping auto-install.
        echo   Please download and install manually:
        echo   https://www.postgresql.org/download/windows/
        echo.
        echo   Or use: winget install PostgreSQL.PostgreSQL
        set /a MISSING+=1
    )
)

REM ============================================
REM 5. CHECK MySQL (alternative)
REM ============================================
echo.
echo [5/8] Checking MySQL (optional alternative)...
where mysql >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('mysql --version 2^>nul') do echo   [OK] %%v
    set "DB_FOUND=1"
    set /a FOUND+=1
) else (
    REM Check common paths
    set "MY_FOUND=0"
    for %%d in ("C:\Program Files\MySQL\MySQL Server 8.0\bin" "C:\mysql\bin") do (
        if exist "%%~d\mysql.exe" (
            echo   [OK] MySQL found at: %%~d
            set "MY_FOUND=1"
            set "DB_FOUND=1"
            set /a FOUND+=1
        )
    )
    if "!MY_FOUND!"=="0" (
        echo   [INFO] MySQL not found (optional - PostgreSQL is primary)
        echo   To install: https://dev.mysql.com/downloads/installer/
        echo   Or: winget install Oracle.MySQL
    )
)

REM ============================================
REM 6. CHECK Python
REM ============================================
echo.
echo [6/8] Checking Python (for ro_monitor.py / ro_agent.py)...
where python3 >nul 2>&1
if %ERRORLEVEL% neq 0 where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('python --version 2^>nul') do echo   [OK] %%v
    set /a FOUND+=1
    
    REM Check pip + libraries
    python -m pip --version >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo   [OK] pip available
        python -c "import requests" 2>nul || (
            echo   [INSTALL] Installing requests...
            python -m pip install requests -q 2>nul
        )
        python -c "import requests" 2>nul && echo   [OK] requests library ready
    )
) else (
    echo   [MISSING] Python not found
    echo   Downloading Python 3.12...
    
    set "PY_URL=https://www.python.org/ftp/python/3.12.1/python-3.12.1-amd64.exe"
    set "PY_INSTALLER=%DL_DIR%\python-3.12.1-amd64.exe"
    
    echo   Downloading: !PY_URL!
    curl -fsSL -o "!PY_INSTALLER!" "!PY_URL!" 2>nul || (
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '!PY_URL!' -OutFile '!PY_INSTALLER!'" 2>nul
    )
    
    if exist "!PY_INSTALLER!" (
        echo   Installing Python (silent)...
        "!PY_INSTALLER!" /quiet InstallAllUsers=1 PrependPath=1 Include_pip=1 2>nul
        echo   [OK] Python installed. Restart terminal to use.
        set /a FOUND+=1
    ) else (
        echo   [FAIL] Could not download Python
        echo   Manual: https://www.python.org/downloads/
        echo   Or: winget install Python.Python.3.12
        set /a MISSING+=1
    )
)

REM ============================================
REM 7. CHECK Git (optional)
REM ============================================
echo.
echo [7/8] Checking Git (optional)...
where git >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('git --version 2^>nul') do echo   [OK] %%v
    set /a FOUND+=1
) else (
    echo   [INFO] Git not found (optional for cloning updates)
    echo   Install: winget install Git.Git
    echo   Or: https://git-scm.com/download/win
)

REM ============================================
REM 8. CHECK curl (for API calls)
REM ============================================
echo.
echo [8/8] Checking curl...
where curl >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   [OK] curl available
    set /a FOUND+=1
) else (
    echo   [INFO] curl not found (Windows 10+ usually has it built-in)
    set /a MISSING+=1
)

REM ============================================
REM SUMMARY
REM ============================================
echo.
echo ╔════════════════════════════════════════════════╗
echo ║           CHECK COMPLETE                        ║
echo ╚════════════════════════════════════════════════╝
echo.
echo  Found:   !FOUND! tools
echo  Missing: !MISSING! tools
echo.
echo  Tool Locations:
echo    Downloads:  %DL_DIR%
echo    Tools:      %TOOLS_DIR%
echo.

REM Show PATH additions
echo  PATH additions (add these if not auto-added):
if exist "%TOOLS_DIR%\node-v20.11.0-win-x64\node.exe" (
    echo    Node:  %TOOLS_DIR%\node-v20.11.0-win-x64
)
if exist "%TOOLS_DIR%\platform-tools\adb.exe" (
    echo    ADB:   %TOOLS_DIR%\platform-tools
)
if exist "C:\platform-tools\adb.exe" (
    echo    ADB:   C:\platform-tools
)

echo.
echo  Next Steps:
echo  ============
echo.

REM Check if we can proceed
if !MISSING! gtr 2 (
    echo  [!] Some tools missing. Install them first, then re-run this script.
    echo.
)

echo  1. If Node.js is ready:
echo     npm install
echo     npm run build
echo.
echo  2. Setup Database:
if defined DB_FOUND (
    echo     [DB found] Create database:
    echo     PostgreSQL: createdb -U postgres app_db
    echo     MySQL:     mysql -u root -e "CREATE DATABASE app_db;"
) else (
    echo     [No DB] Install PostgreSQL or MySQL first
    echo     PostgreSQL: https://www.postgresql.org/download/windows/
    echo     Or: winget install PostgreSQL.PostgreSQL
)
echo.
echo  3. Apply schema:
echo     npx drizzle-kit push
echo.
echo  4. Start server:
echo     npm run start
echo.
echo  5. Open browser:
echo     http://localhost:3000
echo.
echo  6. Connect Android:
echo     adb devices           (USB)
echo     adb tcpip 5555        (enable WiFi)
echo     adb connect IP:5555   (WiFi)
echo.
echo  7. APK Agent (no ADB needed):
echo     Install Termux on Android
echo     pip3 install requests
echo     set RO_SERVER=http://YOUR_IP:3000
echo     python3 ro_agent.py
echo.

pause
