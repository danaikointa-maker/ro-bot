#!/usr/bin/env bash
# RO Bot Server Installer v3.0
# ติดตั้งขั้นต่ำสุด → เปิดเวป Setup Wizard → จัดการต่อในเวป
# รองรับ: Linux, macOS, Windows (WSL/Git Bash)

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${BLUE}[>]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     RO Bot Server Installer v3.0                    ║"
echo "║     Web Setup Wizard + Python3 Background Service   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ===== STEP 1: Node.js (required minimum) =====
log "Step 1/5: Checking Node.js..."
if command -v node &>/dev/null; then
    ok "Node.js $(node --version)"
else
    warn "Node.js NOT FOUND - installing..."
    OS=$(uname -s)
    if [[ "$OS" == "Linux" ]]; then
        if command -v apt &>/dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null || true
            sudo apt install -y nodejs 2>/dev/null || true
        elif command -v yum &>/dev/null; then
            sudo yum install -y nodejs npm 2>/dev/null || true
        fi
    elif [[ "$OS" == "Darwin" ]]; then
        brew install node 2>/dev/null || true
    fi
    if command -v node &>/dev/null; then ok "Node.js $(node --version)"
    else
        echo ""
        echo "  ERROR: Node.js required. Install manually:"
        echo "    https://nodejs.org/"
        echo "    Or: winget install OpenJS.NodeJS.LTS (Windows)"
        exit 1
    fi
fi

# ===== STEP 2: npm install =====
log "Step 2/5: Installing npm dependencies..."
npm install 2>&1 | tail -3
ok "npm modules installed"

# ===== STEP 3: Build =====
log "Step 3/5: Building application..."
npm run build 2>&1 | tail -3
ok "Build complete"

# ===== STEP 4: Start server =====
log "Step 4/5: Starting server..."
# Kill old instance if running
pkill -f "next start" 2>/dev/null || true
sleep 1
nohup npm run start > /tmp/ro-server.log 2>&1 &
sleep 3

# Check if running
if curl -s -o /dev/null http://localhost:3000/api/health 2>/dev/null; then
    ok "Server running at http://localhost:3000"
else
    warn "Server may need a moment... waiting..."
    sleep 3
    if curl -s -o /dev/null http://localhost:3000/api/health 2>/dev/null; then
        ok "Server running"
    else
        warn "Check log: /tmp/ro-server.log"
    fi
fi

# ===== STEP 5: Open Setup Wizard =====
log "Step 5/5: Opening Setup Wizard in browser..."
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║           INSTALLATION COMPLETE                      ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  Setup Wizard (check tools + create DB):             ║"
echo "║    http://localhost:3000/setup                        ║"
echo "║                                                      ║"
echo "║  Dashboard (control game after setup):               ║"
echo "║    http://localhost:3000                              ║"
echo "║                                                      ║"
echo "║  Python3 Background Service:                         ║"
echo "║    python3 ro_service.py                             ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  The Setup Wizard will:"
echo "    1. Check Node.js, ADB, Python, DB, Tesseract, Git"
echo "    2. Show download links for missing tools"
echo "    3. Let you select PostgreSQL or MySQL"
echo "    4. Create app_db database automatically"
echo "    5. Show command to apply schema"
echo ""
echo "  Python3 ro_service.py will:"
echo "    - Auto-check tools every 30 seconds"
echo "    - Auto-install missing Python libs"
echo "    - Auto-create DB if missing"
echo "    - Monitor ADB devices"
echo "    - Report status to server"
echo ""

# Try to open browser
if command -v xdg-open &>/dev/null; then
    xdg-open http://localhost:3000/setup 2>/dev/null || true
elif command -v open &>/dev/null; then
    open http://localhost:3000/setup 2>/dev/null || true
fi

# Offer to start Python service
read -p "Start Python3 background service? [Y/n]: " PY_START
if [[ "${PY_START:-Y}" =~ ^[Yy] ]]; then
    if command -v python3 &>/dev/null; then
        nohup python3 ro_service.py > /tmp/ro_service.log 2>&1 &
        ok "ro_service.py started (log: /tmp/ro_service.log)"
    else
        warn "python3 not found - install: sudo apt install python3 python3-pip"
    fi
fi

echo ""
echo "Done! Open http://localhost:3000/setup to continue setup."
