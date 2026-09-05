# RO Bot Windows Server Installation Script
# ใช้ใน PowerShell (Run as Administrator)
# ถ้าเจอ Execution Policy error ให้รันผ่าน .bat แทน:
#   install_windows.bat        (ติดตั้ง)
#   check_install.bat          (ตรวจสอบ)

# Self-elevate to Admin if not already
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[WARN] Not running as Administrator. Restarting with elevation..." -ForegroundColor Yellow
    Start-Process PowerShell -ArgumentList "-ExecutionPolicy Bypass -NoProfile -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RO Bot Multi-Device Server Setup" -ForegroundColor Yellow
Write-Host "  Version 2.0.0" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/7] Checking Node.js..." -ForegroundColor Cyan
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  Node.js not found! Download from: https://nodejs.org/" -ForegroundColor Red
    Write-Host "  Or install via: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    exit 1
}
Write-Host "  Node version: $(node --version) at $($node.Source)" -ForegroundColor Green

# Check npm
Write-Host "[2/7] Checking npm..." -ForegroundColor Cyan
npm --version | Out-Null
Write-Host "  npm OK" -ForegroundColor Green

# Check ADB
Write-Host "[3/7] Checking ADB (Android Debug Bridge)..." -ForegroundColor Cyan
$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Host "  ADB not found in PATH." -ForegroundColor Red
    Write-Host "  Download: https://developer.android.com/studio/releases/platform-tools" -ForegroundColor Yellow
    Write-Host "  Extract to C:\platform-tools and add to System PATH" -ForegroundColor Yellow
} else {
    Write-Host "  ADB OK: $($adb.Source)" -ForegroundColor Green
    adb version | Out-String | Write-Host
}

# Ask for DB choice
Write-Host "[4/7] Database Choice" -ForegroundColor Cyan
$dbChoice = Read-Host "Use PostgreSQL (P) or MySQL (M)? [P/M]"
if ($dbChoice -match "^[Mm]") {
    $dbType = "mysql"
    $dbUrl = "mysql://root:root@localhost:3306/app_db"
    Write-Host "  Selected: MySQL" -ForegroundColor Yellow
} else {
    $dbType = "postgresql"
    $dbUrl = "postgresql://postgres:postgres@localhost:5432/app_db"
    Write-Host "  Selected: PostgreSQL" -ForegroundColor Yellow
}

# Setup database
Write-Host "[5/7] Setting up Database ($dbType)..." -ForegroundColor Cyan
if ($dbType -eq "mysql") {
    try {
        Start-Service MySQL80 -ErrorAction SilentlyContinue 2>$null
        Write-Host "  MySQL service started (or already running)" -ForegroundColor Green
    } catch {
        Write-Host "  Could not start MySQL service (may need manual start)" -ForegroundColor Yellow
    }
    try {
        mysql -u root -e "CREATE DATABASE IF NOT EXISTS app_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>$null
        mysql -u root -e "CREATE USER IF NOT EXISTS 'ro_user'@'localhost' IDENTIFIED BY 'ro_secret';" 2>$null
        mysql -u root -e "GRANT ALL PRIVILEGES ON app_db.* TO 'ro_user'@'localhost';" 2>$null
        mysql -u root -e "FLUSH PRIVILEGES;" 2>$null
        Write-Host "  MySQL database 'app_db' created" -ForegroundColor Green
    } catch {
        Write-Host "  MySQL setup skipped (check if MySQL is installed)" -ForegroundColor Yellow
    }
    Set-Content -Path .env -Value "DATABASE_URL=$dbUrl`nNODE_ENV=production`nPORT=3000`nHOST=0.0.0.0`n"
} else {
    try {
        $pgPath = "C:\Program Files\PostgreSQL\16\bin"
        if (-not (Test-Path $pgPath)) {
            $pgPath = "C:\Program Files\PostgreSQL\15\bin"
        }
        if (-not (Test-Path $pgPath)) {
            $pgPath = "C:\Program Files\PostgreSQL\14\bin"
        }
        $env:PATH += ";$pgPath"

        Start-Service postgresql-x64-16 2>$null
        Start-Service postgresql-x64-15 2>$null
        Start-Service postgresql 2>$null
        Write-Host "  PostgreSQL service started" -ForegroundColor Green
    } catch {
        Write-Host "  Could not start PostgreSQL service" -ForegroundColor Yellow
    }
    try {
        $psqlExe = Join-Path $pgPath "psql.exe"
        if (Test-Path $psqlExe) {
            & $psqlExe -U postgres -d postgres -c "CREATE DATABASE app_db;" 2>$null
            & $psqlExe -U postgres -d app_db -c "CREATE USER ro_user WITH PASSWORD 'ro_secret';" 2>$null
            & $psqlExe -U postgres -d app_db -c "GRANT ALL PRIVILEGES ON DATABASE app_db TO ro_user;" 2>$null
        }
        Write-Host "  PostgreSQL database 'app_db' created" -ForegroundColor Green
    } catch {
        Write-Host "  PostgreSQL setup skipped (check installation)" -ForegroundColor Yellow
    }
    Set-Content -Path .env -Value "DATABASE_URL=$dbUrl`nNODE_ENV=production`nPORT=3000`nHOST=0.0.0.0`n"
}

# Install dependencies
Write-Host "[6/7] Installing Node dependencies..." -ForegroundColor Cyan
npm install 2>&1 | Select-Object -Last 3 | Write-Host

# Apply Drizzle schema
Write-Host "[7/7] Applying database schema..." -ForegroundColor Cyan
$y = Read-Host "Apply schema? [Y/n]"
if ($y -match "^[Yy]?") {
    $env:NODE_OPTIONS = "--no-deprecation"
    echo "y" | npx drizzle-kit push 2>&1 | Select-Object -Last 5 | Write-Host
    Write-Host "  Schema applied" -ForegroundColor Green
}

# Build
Write-Host "Building production app..." -ForegroundColor Cyan
npm run build 2>&1 | Select-Object -Last 5 | Write-Host
Write-Host "  Build complete!" -ForegroundColor Green

# Final instructions
Write-Host "" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALLATION COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Start Server:" -ForegroundColor White
Write-Host "  npm run start" -ForegroundColor Yellow
Write-Host "  (or use: start npm -- run start)" -ForegroundColor Gray
Write-Host ""
Write-Host "Start ADB Monitor:" -ForegroundColor White
Write-Host "  python ro_monitor.py --interval 5 --port 3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Access Web Dashboard:" -ForegroundColor White
Write-Host "  http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Multi-Device Setup:" -ForegroundColor White
Write-Host "  1. Connect Android via USB or WiFi (adb connect)" -ForegroundColor Gray
Write-Host "  2. Open Web - ADB tab - Scan - Select Device" -ForegroundColor Gray
Write-Host "  3. Game Control tab - Click screen - Control game" -ForegroundColor Gray
Write-Host ""

# Offer to start
$start = Read-Host "Start server now? [Y/n]"
if ($start -match "^[Yy]?") {
    Write-Host "Starting server..." -ForegroundColor Green
    Start-Process -WindowStyle Hidden -FilePath "cmd" -ArgumentList "/c","npm","run","start"
    Start-Sleep -Seconds 3
    Write-Host "Server running at: http://localhost:3000" -ForegroundColor Green
    Start-Process "http://localhost:3000"
    Write-Host "Browser opened automatically." -ForegroundColor Green
}
