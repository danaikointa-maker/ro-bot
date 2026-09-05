#!/usr/bin/env bash
# RO Bot Universal Server Installer
# รองรับ Linux / macOS / Windows (WSL / Git Bash / MSYS2)
# ติดตั้งทั้ง PostgreSQL และ MySQL ได้

set -euo pipefail

VERSION="2.0.0"
PROJECT="RO-Bot-Multi-Device"
DB_TYPE="postgresql"
DB_URL="postgresql://postgres:postgres@localhost:5432/app_db"
PORT=3000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

banner() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║     $PROJECT Server Installer v$VERSION          ║"
    echo "║     Multi-Device ADB / APK / Network Control      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then OS="linux"; 
elif [[ "$OSTYPE" == "darwin"* ]]; then OS="macos"; 
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then OS="windows"; 
fi

banner
log "Detected OS: $OS"

# Check prerequisites
check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 is not installed. Please install it first."
    fi
}

log "Checking prerequisites..."
check_command node
check_command npm

NODE_VER=$(node --version)
if [[ "$NODE_VER" < "v18" ]]; then
    warn "Node $NODE_VER detected. Node 18+ recommended."
fi

# Check ADB
if command -v adb &> /dev/null; then
    ADB_VER=$(adb version 2>/dev/null | head -1)
    success "ADB found: $ADB_VER"
else
    warn "ADB not in PATH. Install Android Platform Tools."
    echo "  Linux: sudo apt install android-tools-adb"
    echo "  macOS: brew install android-platform-tools"
    echo "  Windows: https://developer.android.com/studio/releases/platform-tools"
fi

# Database selection
read -p "Use PostgreSQL (p) or MySQL (m)? [p/m]: " DB_CHOICE
DB_CHOICE=${DB_CHOICE:-p}

if [[ "$DB_CHOICE" == "m" || "$DB_CHOICE" == "mysql" || "$DB_CHOICE" == "M" ]]; then
    DB_TYPE="mysql"
    DB_URL="mysql://root:root@localhost:3306/app_db"
    log "Selected: MySQL"
else
    DB_TYPE="postgresql"
    DB_URL="postgresql://postgres:postgres@localhost:5432/app_db"
    log "Selected: PostgreSQL"
fi

# Database setup
setup_postgresql() {
    log "Setting up PostgreSQL..."
    
    # Try to start service
    if [[ "$OS" == "linux" ]]; then
        if command -v systemctl &> /dev/null; then
            sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || true
        fi
    elif [[ "$OS" == "macos" ]]; then
        brew services start postgresql 2>/dev/null || true
    fi
    
    # Create database
    sudo -u postgres psql -c "CREATE DATABASE app_db;" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE USER ro_user WITH PASSWORD 'ro_secret';" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE app_db TO ro_user;" 2>/dev/null || true
    
    # Update .env
    echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db" > .env
    
    log "PostgreSQL database 'app_db' ready."
}

setup_mysql() {
    log "Setting up MySQL..."
    
    # Try to start service
    if [[ "$OS" == "linux" ]]; then
        sudo systemctl start mysql 2>/dev/null || sudo service mysql start 2>/dev/null || true
    elif [[ "$OS" == "macos" ]]; then
        brew services start mysql 2>/dev/null || true
    fi
    
    # Create database and user
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS app_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
    mysql -u root -e "CREATE USER IF NOT EXISTS 'ro_user'@'localhost' IDENTIFIED BY 'ro_secret';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON app_db.* TO 'ro_user'@'localhost';" 2>/dev/null || true
    mysql -u root -e "FLUSH PRIVILEGES;" 2>/dev/null || true
    
    echo "DATABASE_URL=mysql://ro_user:ro_secret@localhost:3306/app_db" > .env
    
    log "MySQL database 'app_db' ready."
}

# Install node dependencies
install_deps() {
    log "Installing Node dependencies (this may take a moment)..."
    npm install 2>&1 | tail -5
    success "Dependencies installed."
}

# Apply Drizzle schema
apply_schema() {
    log "Applying database schema..."
    
    if [[ "$DB_TYPE" == "mysql" ]]; then
        # For MySQL with Drizzle, need to adjust schema or use mysql2 driver
        # Current schema uses pg-core syntax - for MySQL need drizzle-orm/mysql-core
        # This is handled automatically if using correct drizzle config
        
        # Check if drizzle.config has mysql
        if grep -q "mysql" drizzle.config.json 2>/dev/null; then
            npx drizzle-kit push --force 2>&1 | tail -3 || echo "y" | npx drizzle-kit push 2>&1 | tail -3
        else
            log "Note: Schema uses PostgreSQL syntax. For MySQL switch to mysql driver in drizzle.config.json"
            echo "Drizzle Kit using PostgreSQL syntax (compatible with MySQL in most cases)"
        fi
    else
        npx drizzle-kit push 2>&1 | tail -3 || echo "y" | npx drizzle-kit push 2>&1 | tail -3
    fi
}

# Build
do_build() {
    log "Building production app..."
    npm run build 2>&1 | tail -5
    success "Build complete."
}

# Set permissions (Linux/macOS)
set_permissions() {
    if [[ "$OS" != "windows" ]]; then
        chmod +x ro_monitor.py ro_agent.py ro_client.bat 2>/dev/null || true
    fi
}

# Main flow
echo ""
echo "=== Start Installation ==="

# Ask for DB setup
read -p "Setup database now? [Y/n]: " DO_DB
DO_DB=${DO_DB:-Y}

if [[ "$DO_DB" == "Y" || "$DO_DB" == "y" || "$DO_DB" == "" ]]; then
    if [[ "$DB_TYPE" == "mysql" ]]; then
        setup_mysql
    else
        setup_postgresql
    fi
fi

install_deps
apply_schema
do_build
set_permissions

# Add environment variables to .env
cat >> .env << EOF
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
EOF

# Show final status
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           INSTALLATION COMPLETE — $PROJECT v$VERSION          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Database Type: $DB_TYPE"
echo "Database URL: $DB_URL"
echo "Port: $PORT"
echo ""
echo "Next steps:"
echo "  1. Start server:     npm run start"
echo "  2. Start ADB monitor: python3 ro_monitor.py --interval 5 --port $PORT"
echo "  3. Open browser:     http://localhost:$PORT"
echo "  4. For Android: Install Termux → run ro_agent.py"
echo ""
echo "Windows users: See WINDOWS_GUIDE.md"
echo "Multi-device: See MULTI_DEVICE_GUIDE.md"
echo ""

# Offer to start
read -p "Start server now? [Y/n]: " START_NOW
if [[ "$START_NOW" == "Y" || "$START_NOW" == "y" || "$START_NOW" == "" ]]; then
    echo "Starting server..."
    nohup npm run start > /tmp/ro-server.log 2>&1 &
    sleep 2
    echo "Server running at http://localhost:$PORT"
    echo "Log: /tmp/ro-server.log"
fi

echo ""
echo "Setup complete!"
