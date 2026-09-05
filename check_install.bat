@echo off
REM RO Bot Pre-Install Checker - Bypasses PowerShell Execution Policy
REM This .bat file runs the .ps1 check script with -ExecutionPolicy Bypass

echo.
echo ============================================
echo  RO Bot PRE-INSTALL CHECK - Windows
echo  (Bypasses PowerShell Execution Policy)
echo ============================================
echo.

REM Run the PowerShell check script with bypass policy
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0check_install_windows.ps1" %*

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] PowerShell script failed.
    echo Try running manually:
    echo   powershell -ExecutionPolicy Bypass -File .\check_install_windows.ps1
    echo.
    pause
)
