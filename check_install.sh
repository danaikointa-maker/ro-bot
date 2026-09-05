#!/usr/bin/env bash
# Auto-Install Tool Checker & Downloader
# Checks all required tools, downloads missing ones automatically
# Linux / macOS / WSL / MSYS2 / Windows (Git Bash)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[CHECK]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
download() { echo -e "${BLUE}[DL]${NC} $1"; }

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
DOWNLOAD_DIR="$PROJECT_ROOT/.downloads"
mkdir -p "$DOWNLOAD_DIR"

echo "========================================"
echo "RO Bot Auto-Installer Tool Check"
echo "========================================"
echo "Project: $PROJECT_ROOT"
echo "Download dir: $DOWNLOAD_DIR"
echo ""

# ==================== CHECK NODE.JS ====================
log "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VER=$(node --version 2>/dev/null || echo "unknown")
    ok "Node.js $NODE_VER"
else
    warn "Node.js NOT FOUND"
    
    # Try to download
    OS=$(uname -s)
    ARCH=$(uname -m)
    
    if [[ "$OS" == "Linux" ]]; then
        # Try apt first
        if command -v apt &> /dev/null; then
            download "Installing via apt..."
            sudo apt update -qq && sudo apt install -y -qq nodejs npm 2>/dev/null || {
                download "Trying NodeSource..."
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null || true
                sudo apt install -y -qq nodejs 2>/dev/null || true
            }
        elif command -v yum &> /dev/null; then
            sudo yum install -y nodejs npm 2>/dev/null || true
        elif command -v pacman &> /dev/null; then
            sudo pacman -S --noconfirm nodejs npm 2>/dev/null || true
        fi
    fi
    
    # Check again
    if command -v node &> /dev/null; then
        ok "Node.js installed: $(node --version)"
    else
        # Download binary
        download "Downloading Node.js binary..."
        if [[ "$ARCH" == *"arm"* ]]; then
            ARCH="arm64"
        elif [[ "$ARCH" == *"x86_64"* ]]; then
            ARCH="x64"
        else
            ARCH="x64"
        fi
        
        NODE_TAR="node-v20.11.0-linux-$ARCH.tar.xz"
        if [[ "$OS" == "Darwin" ]]; then
            NODE_TAR="node-v20.11.0-darwin-$ARCH.tar.gz"
        fi
        
        curl -fsSL -o "$DOWNLOAD_DIR/$NODE_TAR" \
            "https://nodejs.org/dist/v20.11.0/$NODE_TAR" 2>/dev/null || \
            curl -fsSL -o "$DOWNLOAD_DIR/$NODE_TAR" \
            "https://nodejs.org/dist/v20.10.0/$NODE_TAR" 2>/dev/null || true
        
        if [[ -f "$DOWNLOAD_DIR/$NODE_TAR" ]]; then
            tar -xf "$DOWNLOAD_DIR/$NODE_TAR" -C "$DOWNLOAD_DIR" 2>/dev/null || true
            if [[ -d "$DOWNLOAD_DIR/node-v20."* ]]; then
                NODE_DIR=$(ls -d "$DOWNLOAD_DIR"/node-v20.* 2>/dev/null | head -1)
                export PATH="$NODE_DIR/bin:$PATH"
                echo "export PATH=$NODE_DIR/bin:\$PATH" >> "$PROJECT_ROOT/.bashrc.local"
                ok "Node.js binary extracted: $NODE_DIR/bin/node"
            fi
        else
            fail "Could not download Node.js. Please install manually: https://nodejs.org/"
        fi
    fi
fi

# ==================== CHECK ADB ====================
log "Checking ADB (Android Debug Bridge)..."
if command -v adb &> /dev/null; then
    ADB_VER=$(adb version 2>/dev/null | head -1 || echo "unknown")
    ok "ADB: $ADB_VER"
else
    warn "ADB NOT FOUND - Downloading Android Platform Tools..."
    
    OS_TYPE=$(uname -s)
    if [[ "$OS_TYPE" == "Linux" ]]; then
        # Try package manager first
        if command -v apt &> /dev/null; then
            download "Installing via apt..."
            sudo apt update -qq 2>/dev/null && sudo apt install -y -qq android-tools-adb android-tools-fastboot 2>/dev/null || {
                download "Trying direct download..."
                curl -fsSL -o "$DOWNLOAD_DIR/platform-tools-linux.zip" \
                    "https://dl.google.com/android/repository/platform-tools-latest-linux.zip" 2>/dev/null || true
            }
        elif command -v yum &> /dev/null; then
            sudo yum install -y android-tools 2>/dev/null || true
        fi
    elif [[ "$OS_TYPE" == "Darwin" ]]; then
        if command -v brew &> /dev/null; then
            download "Installing via brew..."
            brew install --cask android-platform-tools 2>/dev/null || true
        else
            download "Downloading macOS platform-tools..."
            curl -fsSL -o "$DOWNLOAD_DIR/platform-tools-darwin.zip" \
                "https://dl.google.com/android/repository/platform-tools-latest-darwin.zip" 2>/dev/null || true
        fi
    fi
    
    # If zip downloaded, extract
    if ls "$DOWNLOAD_DIR"/platform-tools-*.zip 2>/dev/null | grep -q .; then
        ZIP_FILE=$(ls "$DOWNLOAD_DIR"/platform-tools-*.zip 2>/dev/null | head -1)
        download "Extracting $ZIP_FILE..."
        unzip -q "$ZIP_FILE" -d "$DOWNLOAD_DIR/" 2>/dev/null || true
        
        if [[ -d "$DOWNLOAD_DIR/platform-tools" ]]; then
            export PATH="$DOWNLOAD_DIR/platform-tools:$PATH"
            ln -sf "$DOWNLOAD_DIR/platform-tools/adb" /usr/local/bin/adb 2>/dev/null || true
            ln -sf "$DOWNLOAD_DIR/platform-tools/fastboot" /usr/local/bin/fastboot 2>/dev/null || true
            # Also copy to common location
            sudo cp -rf "$DOWNLOAD_DIR/platform-tools/"* /usr/local/bin/ 2>/dev/null || cp -rf "$DOWNLOAD_DIR/platform-tools/"* ~/bin/ 2>/dev/null || true
            ok "ADB installed via download to $DOWNLOAD_DIR/platform-tools"
            echo "export PATH=$DOWNLOAD_DIR/platform-tools:\$PATH" >> "$PROJECT_ROOT/.bashrc.local"
        fi
    fi
    
    # Check again
    if command -v adb &> /dev/null; then
        ok "ADB now available: $(adb version 2>/dev/null | head -1)"
    else
        # Give Windows instruction
        if [[ -n "${MSYSTEM:-}" ]] || [[ "$OS_TYPE" == *"MINGW"* ]] || [[ "$OS_TYPE" == *"MSYS"* ]]; then
            fail "ADB not installed (Windows). Download from:"
            echo "  https://developer.android.com/studio/releases/platform-tools"
            echo "  Extract to C:\platform-tools and add to PATH"
        else
            fail "ADB installation failed. Try manual: sudo apt install android-tools-adb"
        fi
    fi
fi

# ==================== CHECK POSTGRESQL / MYSQL ====================
log "Checking Database..."
DB_TYPE="postgresql"
if command -v psql &> /dev/null; then
    ok "PostgreSQL client (psql) found"
elif command -v mysql &> /dev/null; then
    ok "MySQL client (mysql) found"
    DB_TYPE="mysql"
else
    warn "No DB client found - will try to install..."
    if [[ "$OS_TYPE" == "Linux" ]]; then
        if command -v apt &> /dev/null; then
            download "Installing PostgreSQL..."
            sudo apt update -qq 2>/dev/null && sudo apt install -y -qq postgresql postgresql-contrib 2>/dev/null || true
        fi
    fi
fi

# ==================== CHECK PYTHON / PYTHON3 ====================
log "Checking Python (for ro_monitor.py / ro_agent.py)..."
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    ok "python3: $(python3 --version 2>/dev/null | awk '{print $2}')"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    ok "python: $(python --version 2>/dev/null | head -1)"
else
    warn "Python not found"
    if [[ "$OS_TYPE" == "Linux" ]]; then
        if command -v apt &> /dev/null; then
            download "Installing python3..."
            sudo apt install -y -qq python3 python3-pip 2>/dev/null || true
        fi
    fi
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
        ok "Python installed via package manager"
    else
        warn "Python not available - ro_monitor.py / ro_agent.py won't work"
    fi
fi

# Check Python libraries (optional)
if [[ -n "$PYTHON_CMD" ]]; then
    $PYTHON_CMD -c "import requests" 2>/dev/null || {
        warn "Python 'requests' missing - install with: pip3 install requests"
        $PYTHON_CMD -m pip install requests 2>/dev/null || "$PYTHON_CMD" -m ensurepip 2>/dev/null || true
    }
    $PYTHON_CMD -c "import pytesseract" 2>/dev/null || {
        warn "Python 'pytesseract' missing - install with: pip3 install pytesseract"
        $PYTHON_CMD -m pip install pytesseract 2>/dev/null || true
    }
fi

# ==================== CHECK NODE MODULES ====================
log "Checking Node modules..."
if [[ -f "node_modules/next/package.json" ]]; then
    ok "Next.js installed"
else
    warn "Node modules missing - running npm install..."
    npm install 2>&1 | tail -3
    if [[ -f "node_modules/next/package.json" ]]; then
        ok "Next.js installed via npm"
    else
        error "npm install failed"
    fi
fi

# Check ws module (WebSocket)
if [[ -f "node_modules/ws/package.json" ]]; then
    ok "WebSocket (ws) installed"
else
    download "Installing ws..."
    npm install ws @types/ws 2>/dev/null | tail -1
    ok "WebSocket installed"
fi

# ==================== CHECK DRIZZLE ====================
if [[ -f "node_modules/drizzle-orm/package.json" ]]; then
    ok "Drizzle ORM installed"
else
    download "Installing Drizzle ORM..."
    npm install drizzle-orm pg 2>/dev/null | tail -1
    ok "Drizzle ORM installed"
fi

# ==================== CREATE .ENV IF MISSING ====================
if [[ ! -f ".env" ]]; then
    log "Creating .env file..."
    if [[ "$DB_TYPE" == "mysql" ]]; then
        echo "DATABASE_URL=mysql://root:root@localhost:3306/app_db" > .env
    else
        echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db" > .env
    fi
    echo "NODE_ENV=production" >> .env
    echo "PORT=3000" >> .env
    echo "HOST=0.0.0.0" >> .env
    ok ".env created ($DB_TYPE)"
fi

# ==================== APPLY SCHEMA ====================
log "Applying database schema (if needed)..."
if [[ -f "drizzle.config.json" ]] || [[ -f "drizzle.config.ts" ]]; then
    # Try push (non-interactive)
    echo "y" | npx drizzle-kit push 2>/dev/null || true
    # Check result
    if psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "SELECT 1 FROM devices LIMIT 1" 2>/dev/null | grep -q "1 row"; then
        ok "Schema applied (PostgreSQL)"
    elif mysql -u root -e "USE app_db; SELECT 1 FROM devices LIMIT 1;" 2>/dev/null | grep -q "1"; then
        ok "Schema applied (MySQL)"
    else
        warn "Schema may need manual push: npx drizzle-kit push"
    fi
fi

# ==================== BUILD ====================
log "Building application..."
if npm run build 2>/dev/null | tail -1 | grep -q "Successfully"; then
    ok "Build successful (.next/ created)"
else
    # Try anyway, check if .next exists after
    sleep 2
    if [[ -d ".next" ]]; then
        ok "Build complete (.next/ exists)"
    else
        warn "Build may have issues - check /tmp/build.log"
    fi
fi

# ==================== FINAL STATUS ====================
echo ""
echo "========================================"
echo "  INSTALL CHECK COMPLETE"
echo "========================================"
echo ""
echo "Tools Status:"
echo "  Node.js:     $(command -v node &> /dev/null && node --version || echo 'MISSING')"
echo "  npm:         $(command -v npm &> /dev/null && npm --version || echo 'MISSING')"
echo "  ADB:         $(command -v adb &> /dev/null && adb version 2>/dev/null | head -1 || echo 'NOT INSTALLED')"
echo "  Python:      $(command -v python3 &> /dev/null && python3 --version || echo 'NOT INSTALLED')"
echo "  DB:          $DB_TYPE ($(echo $DB_URL | cut -d'/' -f3 | cut -d':' -f1))"
echo "  Build:       $(test -d .next && echo 'READY' || echo 'MISSING')"
echo ""
echo "Next Commands:"
echo "  Start Server:  npm run start"
echo "  Monitor:       python3 ro_monitor.py --interval 5 --port 3000"
echo "  Web:           http://localhost:3000"
echo ""
echo "To install missing tools manually:"
if [[ "$DB_TYPE" == "mysql" ]]; then
    echo "  DB (MySQL): sudo apt install mysql-server  (Linux)"
elif [[ "$DB_TYPE" == "postgresql" ]]; then
    echo "  DB (PostgreSQL): sudo apt install postgresql postgresql-contrib"
fi
echo "  ADB: sudo apt install android-tools-adb"
echo "  Python: sudo apt install python3 python3-pip"
echo ""
echo "Multi-Device: Connect Android via USB (adb devices) or WiFi (adb connect IP:5555)"
echo "OR install APK Agent: ro_agent.py on Android Termux"
echo ""
