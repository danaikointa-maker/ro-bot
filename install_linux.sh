#!/usr/bin/env bash
# RO Bot Linux/macOS Quick Installer v3.0
# 1 command install → Web Setup Wizard does the rest
# Usage: bash install_linux.sh

set -e

echo "Installing RO Bot..."
echo ""

# Node.js
if ! command -v node &>/dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null || true
    sudo apt install -y nodejs 2>/dev/null || brew install node 2>/dev/null || true
fi

# npm deps + build
npm install 2>&1 | tail -1
npm run build 2>&1 | tail -1

# Start
nohup npm run start > /tmp/ro-server.log 2>&1 &
sleep 3

echo ""
echo "Open: http://localhost:3000/setup"
echo ""

# Auto-open browser
xdg-open http://localhost:3000/setup 2>/dev/null || open http://localhost:3000/setup 2>/dev/null || true

# Python service
if command -v python3 &>/dev/null; then
    nohup python3 ro_service.py > /tmp/ro_service.log 2>&1 &
    echo "Python service started"
fi

echo "Done!"
