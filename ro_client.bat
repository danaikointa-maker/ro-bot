@echo off
REM RO Bot Windows Client Launcher
REM Usage: ro_client.bat [DEVICE_ID]
REM Starts server + opens browser with device selected
REM Requires Windows with ADB installed (platform-tools)

echo ============================================
echo RO Bot Windows Client v2.0
echo Multi-Device ADB Control System
echo ============================================

set DEVICE=%1
if "%DEVICE%"=="" (
    echo.
    echo Usage: ro_client.bat [DEVICE_ID] [PORT]
    echo Example: ro_client.bat R5CR80XXXXX 3000
    echo.
    echo For WiFi connection, use: adb connect IP:5555 first
    echo.
    set /p DEVICE="Enter Device ID (or leave blank for auto): "
)

echo.
echo Checking ADB...
where adb >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: ADB not found in PATH.
    echo Install Android SDK Platform Tools: https://developer.android.com/studio/releases/platform-tools
    echo Or set ADB_PATH environment variable.
    pause
    exit /b 1
)

echo ADB found: %ADB%

echo.
echo Checking server...
set PORT=%2
if "%PORT%"=="" set PORT=3000

curl -s http://localhost:%PORT%/api/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Server not running at localhost:%PORT%
    echo Starting server (npm run start)...
    start "RO Bot Server" cmd /c "npm run start"
    timeout /t 5 /nobreak >nul
)

echo.
echo Connecting to server...

REM Show ADB devices
adb devices -l
echo.

REM If device specified, try to register
if not "%DEVICE%"=="" (
    echo Registering device: %DEVICE%
    curl -s -X POST http://localhost:%PORT%/api/devices -H "Content-Type: application/json" -d "{\"deviceId\":\"%DEVICE%\",\"connectionType\":\"adb\"}" >nul
)

echo.
echo Opening browser...
start "" "http://localhost:%PORT%"

echo.
echo RO Bot Client Ready!
echo Device: %DEVICE%
echo Server: http://localhost:%PORT%
echo.
echo Commands:
echo   adb connect IP:5555  (WiFi)
echo   adb tcpip 5555     (Enable wireless)
echo   adb shell screencap -p /sdcard/ro.png
pause
