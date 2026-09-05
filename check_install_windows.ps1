# RO Bot Windows Pre-Install Checker (PowerShell)
# Auto-detect + Download missing tools
# Run via: .\check_install.bat  (bypasses Execution Policy)
# Or:      powershell -ExecutionPolicy Bypass -File .\check_install_windows.ps1

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " RO Bot PRE-INSTALL CHECK - Windows" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check Admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$checkNum = 0
$found = 0
$missing = 0
$dlDir = Join-Path $PSScriptRoot ".downloads"
$toolsDir = Join-Path $PSScriptRoot "tools"
New-Item -ItemType Directory -Force -Path $dlDir | Out-Null
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

function Write-Check {
    param([string]$Label)
    $script:checkNum++
    Write-Host ""
    Write-Host "[CHECK $checkNum/10] $Label..." -ForegroundColor Cyan
}

function Download-File {
    param([string]$Url, [string]$Out)
    Write-Host "  Downloading: $Url" -ForegroundColor Blue
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $Url -OutFile $Out -UseBasicParsing
        return $true
    } catch {
        try { curl -fsSL -o $Out $Url 2>$null; return (Test-Path $Out) } catch { return $false }
    }
}

# 1. Admin
Write-Check "Administrator Rights"
if ($isAdmin) { Write-Host "  [PASS] Running as Admin" -ForegroundColor Green }
else { Write-Host "  [WARN] Not Admin - some installs may fail" -ForegroundColor Yellow }

# 2. PowerShell
Write-Check "PowerShell"
Write-Host "  [PASS] PowerShell $($(Get-Host).Version)" -ForegroundColor Green

# 3. Node.js
Write-Check "Node.js"
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Write-Host "  [PASS] Node.js $(node --version) at $($node.Source)" -ForegroundColor Green
    $found++
} else {
    Write-Host "  [MISSING] Node.js not found - downloading..." -ForegroundColor Red
    $arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
    $url = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-$arch.zip"
    $zip = Join-Path $dlDir "node-v20.11.0-win-$arch.zip"
    if (Download-File $url $zip) {
        Write-Host "  Extracting..." -ForegroundColor Blue
        Expand-Archive -Path $zip -DestinationPath $toolsDir -Force
        $nodeDir = Join-Path $toolsDir "node-v20.11.0-win-$arch"
        if (Test-Path (Join-Path $nodeDir "node.exe")) {
            Write-Host "  [OK] Node.js extracted to: $nodeDir" -ForegroundColor Green
            $env:PATH = "$nodeDir;$env:PATH"
            [Environment]::SetEnvironmentVariable("PATH", "$nodeDir;" + [Environment]::GetEnvironmentVariable("PATH", "User"), "User")
            $found++
        } else { Write-Host "  [FAIL] Extraction failed" -ForegroundColor Red; $missing++ }
    } else { Write-Host "  [FAIL] Download failed. Manual: https://nodejs.org/" -ForegroundColor Red; $missing++ }
}

# 4. npm
Write-Check "npm"
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd) {
    Write-Host "  [PASS] npm $(npm --version)" -ForegroundColor Green
    $found++
} else { Write-Host "  [MISSING] npm (comes with Node.js)" -ForegroundColor Red; $missing++ }

# 5. ADB
Write-Check "ADB (Android Debug Bridge)"
$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
if ($adbCmd) {
    Write-Host "  [PASS] ADB at $($adbCmd.Source)" -ForegroundColor Green
    $found++
} else {
    Write-Host "  [MISSING] ADB not found - downloading..." -ForegroundColor Red
    $url = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
    $zip = Join-Path $dlDir "platform-tools-windows.zip"
    if (Download-File $url $zip) {
        Write-Host "  Extracting..." -ForegroundColor Blue
        Expand-Archive -Path $zip -DestinationPath $toolsDir -Force
        $adbDir = Join-Path $toolsDir "platform-tools"
        if (Test-Path (Join-Path $adbDir "adb.exe")) {
            Write-Host "  [OK] ADB extracted to: $adbDir" -ForegroundColor Green
            $env:PATH = "$adbDir;$env:PATH"
            [Environment]::SetEnvironmentVariable("PATH", "$adbDir;" + [Environment]::GetEnvironmentVariable("PATH", "User"), "User")
            if ($isAdmin) {
                New-Item -ItemType Directory -Force -Path "C:\platform-tools" | Out-Null
                Copy-Item "$adbDir\*" "C:\platform-tools\" -Force
                [Environment]::SetEnvironmentVariable("PATH", "C:\platform-tools;" + [Environment]::GetEnvironmentVariable("PATH", "Machine"), "Machine")
                Write-Host "  [OK] Also copied to C:\platform-tools" -ForegroundColor Green
            }
            $found++
        } else { Write-Host "  [FAIL] Extraction failed" -ForegroundColor Red; $missing++ }
    } else { Write-Host "  [FAIL] Download failed. Manual: https://developer.android.com/studio/releases/platform-tools" -ForegroundColor Red; $missing++ }
}

# 6. PostgreSQL
Write-Check "PostgreSQL"
$dbFound = $false
$pgDirs = @("C:\Program Files\PostgreSQL\16\bin", "C:\Program Files\PostgreSQL\15\bin", "C:\Program Files\PostgreSQL\14\bin")
foreach ($d in $pgDirs) {
    if (Test-Path (Join-Path $d "psql.exe")) {
        Write-Host "  [PASS] PostgreSQL at: $d" -ForegroundColor Green
        $env:PATH = "$d;$env:PATH"
        $dbFound = $true; $found++; break
    }
}
if (-not $dbFound) {
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlCmd) { Write-Host "  [PASS] psql in PATH" -ForegroundColor Green; $dbFound = $true; $found++ }
    else {
        Write-Host "  [MISSING] PostgreSQL not found" -ForegroundColor Red
        Write-Host "  Install: winget install PostgreSQL.PostgreSQL" -ForegroundColor Yellow
        Write-Host "  Or: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
        $missing++
    }
}

# 7. MySQL (optional)
Write-Check "MySQL (optional)"
$mysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue
if ($mysqlCmd) {
    Write-Host "  [PASS] MySQL at $($mysqlCmd.Source)" -ForegroundColor Green
    $dbFound = $true; $found++
} else {
    $myDirs = @("C:\Program Files\MySQL\MySQL Server 8.0\bin", "C:\mysql\bin", "C:\xampp\mysql\bin")
    $myFound = $false
    foreach ($d in $myDirs) {
        if (Test-Path (Join-Path $d "mysql.exe")) {
            Write-Host "  [PASS] MySQL at: $d" -ForegroundColor Green
            $dbFound = $true; $myFound = $true; $found++; break
        }
    }
    if (-not $myFound) { Write-Host "  [INFO] MySQL not found (optional)" -ForegroundColor Yellow }
}

# 8. Python
Write-Check "Python (for ro_monitor / ro_agent)"
$pyCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pyCmd) { $pyCmd = Get-Command python3 -ErrorAction SilentlyContinue }
if ($pyCmd) {
    $pyVer = & $pyCmd.Source --version 2>&1
    Write-Host "  [PASS] $pyVer" -ForegroundColor Green
    $found++
    try {
        & $pyCmd.Source -m pip install requests -q 2>$null
        Write-Host "  [OK] requests library ready" -ForegroundColor Green
    } catch {}
} else {
    Write-Host "  [MISSING] Python not found - downloading..." -ForegroundColor Red
    $url = "https://www.python.org/ftp/python/3.12.1/python-3.12.1-amd64.exe"
    $installer = Join-Path $dlDir "python-3.12.1-amd64.exe"
    if (Download-File $url $installer) {
        Write-Host "  Installing Python (silent)..." -ForegroundColor Blue
        Start-Process -FilePath $installer -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_pip=1" -Wait
        Write-Host "  [OK] Python installed - restart terminal to use" -ForegroundColor Green
        $found++
    } else { Write-Host "  [FAIL] Download failed. Manual: https://www.python.org/downloads/" -ForegroundColor Red; $missing++ }
}

# 9. Git
Write-Check "Git (optional)"
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) { Write-Host "  [PASS] $(git --version)" -ForegroundColor Green; $found++ }
else { Write-Host "  [INFO] Git not found (optional)" -ForegroundColor Yellow }

# 10. curl
Write-Check "curl"
$curlCmd = Get-Command curl -ErrorAction SilentlyContinue
if ($curlCmd) { Write-Host "  [PASS] curl available" -ForegroundColor Green; $found++ }
else { Write-Host "  [INFO] curl not found (Windows 10+ has it built-in)" -ForegroundColor Yellow }

# SUMMARY
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CHECK COMPLETE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Found:   $found" -ForegroundColor Green
Write-Host "  Missing: $missing" -ForegroundColor $(if ($missing -gt 0) { "Red" } else { "Green" })
Write-Host "  Downloads: $dlDir" -ForegroundColor Gray
Write-Host "  Tools:     $toolsDir" -ForegroundColor Gray
Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor White
Write-Host "  1. npm install" -ForegroundColor Yellow
if ($dbFound) {
    Write-Host "  2. DB ready. Run: install_windows.bat" -ForegroundColor Yellow
} else {
    Write-Host "  2. Install PostgreSQL or MySQL first!" -ForegroundColor Red
}
Write-Host "  3. npm run build" -ForegroundColor Yellow
Write-Host "  4. npm run start" -ForegroundColor Yellow
Write-Host "  5. Open: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "  Connect Android:" -ForegroundColor White
Write-Host "    USB:    adb devices" -ForegroundColor Yellow
Write-Host "    WiFi:   adb tcpip 5555 => adb connect IP:5555" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Enter to exit..." -ForegroundColor Gray
Read-Host
