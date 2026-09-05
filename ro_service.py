#!/usr/bin/env python3
"""
RO Bot Background Service (Python3)
รันเงียบๆ เบื้องหลัง คอยตรวจสอบระบบ + ติดตั้ง tools ที่ขาด
เชื่อมกับ Next.js server ผ่าน HTTP API

วิธีใช้:
  python3 ro_service.py                          # รัน foreground
  nohup python3 ro_service.py > /tmp/ro_service.log 2>&1 &  # background
  RO_SERVER=http://localhost:3000 python3 ro_service.py      # ตั้ง server URL
"""

import json
import time
import os
import sys
import subprocess
import signal
import threading
from datetime import datetime

SERVER = os.environ.get("RO_SERVER", "http://localhost:3000")
INTERVAL = int(os.environ.get("RO_INTERVAL", "30"))  # seconds
LOG_FILE = os.environ.get("RO_LOG", "/tmp/ro_service.log")
running = True

def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass

def sig_handler(s, f):
    global running
    running = False
    log("Stopping...")

signal.signal(signal.SIGINT, sig_handler)
signal.signal(signal.SIGTERM, sig_handler)

def shell(cmd, timeout=10):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip(), r.returncode == 0
    except:
        return "", False

def http_get(url):
    try:
        import requests
        r = requests.get(url, timeout=5)
        return r.json() if r.status_code == 200 else None
    except:
        out, _ = shell(f'curl -s "{url}"', timeout=10)
        try:
            return json.loads(out)
        except:
            return None

def http_post(url, data):
    try:
        import requests
        r = requests.post(url, json=data, timeout=10)
        return r.json()
    except:
        try:
            out, _ = shell(f'curl -s -X POST "{url}" -H "Content-Type: application/json" -d \'{json.dumps(data)}\'', timeout=10)
            return json.loads(out)
        except:
            return None

# ============================================
# SYSTEM CHECKER
# ============================================
def check_tools():
    """Check all required tools and report to server"""
    tools = {}

    # Node.js
    ver, ok = shell("node --version")
    tools["node"] = {"installed": ok, "version": ver}

    # ADB
    ver, ok = shell("adb version")
    tools["adb"] = {"installed": ok, "version": ver.split(chr(10))[0] if ok else ""}

    # PostgreSQL
    ver, ok = shell("psql --version")
    db_exists = False
    if ok:
        out, _ = shell("psql -U postgres -lqt 2>/dev/null | grep app_db")
        db_exists = "app_db" in out
    tools["postgresql"] = {"installed": ok, "version": ver, "db_exists": db_exists}

    # MySQL
    ver, ok = shell("mysql --version")
    db_exists = False
    if ok:
        out, _ = shell('mysql -u root -e "SHOW DATABASES LIKE \'app_db\';" 2>/dev/null')
        db_exists = "app_db" in out
    tools["mysql"] = {"installed": ok, "version": ver, "db_exists": db_exists}

    # Python
    ver, ok = shell("python3 --version")
    if not ok:
        ver, ok = shell("python --version")
    tools["python"] = {"installed": ok, "version": ver}

    # Python libs
    libs = {}
    for lib in ["requests", "pytesseract", "PIL"]:
        _, ok = shell(f'python3 -c "import {lib}"')
        if not ok:
            _, ok = shell(f'python -c "import {lib}"')
        libs[lib] = ok
    tools["python_libs"] = libs

    # Tesseract OCR
    ver, ok = shell("tesseract --version")
    tools["tesseract"] = {"installed": ok, "version": ver.split(chr(10))[0] if ok else ""}

    # ADB devices
    devices = []
    if tools["adb"]["installed"]:
        out, _ = shell("adb devices")
        for line in out.split(chr(10)):
            if "device" in line and "List" not in line:
                parts = line.strip().split()
                if parts:
                    devices.append(parts[0])
    tools["adb_devices"] = devices

    return tools

# ============================================
# AUTO-INSTALLER
# ============================================
def auto_install(tool_name):
    """Try to install missing tool automatically"""
    os_type = sys.platform

    if tool_name == "adb":
        log("Installing ADB...")
        if "linux" in os_type:
            out, ok = shell("sudo apt update -qq && sudo apt install -y -qq android-tools-adb android-tools-fastboot", timeout=60)
            if ok:
                log("ADB installed via apt")
                return True
            # Try download
            out, ok = shell(
                'curl -fsSL -o /tmp/platform-tools.zip https://dl.google.com/android/repository/platform-tools-latest-linux.zip && '
                'unzip -qo /tmp/platform-tools.zip -d /opt/ && '
                'sudo ln -sf /opt/platform-tools/adb /usr/local/bin/adb && '
                'sudo ln -sf /opt/platform-tools/fastboot /usr/local/bin/fastboot',
                timeout=30
            )
            if ok:
                log("ADB installed via download")
                return True
        elif "darwin" in os_type:
            out, ok = shell("brew install android-platform-tools", timeout=60)
            if ok:
                log("ADB installed via brew")
                return True
        log("ADB install failed - manual install required")
        return False

    elif tool_name == "python_libs":
        log("Installing Python libraries...")
        for lib in ["requests", "pytesseract", "Pillow"]:
            shell(f"pip3 install {lib} -q 2>/dev/null || pip install {lib} -q 2>/dev/null", timeout=30)
        log("Python libs installed")
        return True

    elif tool_name == "tesseract":
        log("Installing Tesseract OCR...")
        if "linux" in os_type:
            out, ok = shell("sudo apt install -y -qq tesseract-ocr", timeout=60)
            if ok:
                log("Tesseract installed")
                return True
        log("Tesseract install failed")
        return False

    return False

# ============================================
# DB CREATOR
# ============================================
def create_database(db_type="postgresql"):
    """Create app_db database"""
    if db_type == "postgresql":
        out, ok = shell("psql -U postgres -d postgres -c 'CREATE DATABASE app_db;'", timeout=10)
        if ok or "already exists" in out:
            log("PostgreSQL app_db created/exists")
            return True
        # Try with service start
        shell("sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null")
        time.sleep(2)
        out, ok = shell("psql -U postgres -d postgres -c 'CREATE DATABASE app_db;'")
        if ok:
            log("PostgreSQL app_db created after service start")
            return True
    else:
        out, ok = shell("mysql -u root -e 'CREATE DATABASE IF NOT EXISTS app_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'", timeout=10)
        if ok:
            log("MySQL app_db created")
            return True
    return False

# ============================================
# ADB MONITOR
# ============================================
def monitor_adb():
    """Continuously monitor ADB connections and report to server"""
    while running:
        try:
            out, _ = shell("adb devices -l", timeout=5)
            if out:
                devices = []
                for line in out.split(chr(10)):
                    if "device" in line and "List" not in line:
                        parts = line.strip().split()
                        if parts:
                            dev_id = parts[0]
                            model = ""
                            for p in parts[2:]:
                                if p.startswith("model:"):
                                    model = p.split(":")[1]
                            devices.append({"id": dev_id, "model": model})
                # Report to server
                for dev in devices:
                    http_post(f"{SERVER}/api/devices", {
                        "deviceId": dev["id"],
                        "name": dev["model"] or dev["id"],
                        "model": dev["model"],
                        "connectionType": "adb",
                        "status": "connected",
                    })
        except:
            pass
        time.sleep(10)

# ============================================
# MAIN LOOP
# ============================================
def main():
    log("=" * 50)
    log("RO Bot Background Service v2.0")
    log(f"Server: {SERVER}")
    log(f"Interval: {INTERVAL}s")
    log(f"Platform: {sys.platform}")
    log("=" * 50)

    # Initial check
    tools = check_tools()
    log(f"Node.js: {'OK' if tools['node']['installed'] else 'MISSING'}")
    log(f"ADB: {'OK' if tools['adb']['installed'] else 'MISSING'}")
    log(f"PostgreSQL: {'OK' if tools['postgresql']['installed'] else 'MISSING'}")
    log(f"MySQL: {'OK' if tools['mysql']['installed'] else 'MISSING'}")
    log(f"Python libs: {tools['python_libs']}")
    log(f"Tesseract: {'OK' if tools['tesseract']['installed'] else 'MISSING'}")
    log(f"ADB devices: {tools['adb_devices']}")

    # Auto-install missing Python libs
    if not tools['python_libs'].get('requests', False):
        auto_install('python_libs')

    # Auto-create DB if missing
    if tools['postgresql']['installed'] and not tools['postgresql']['db_exists']:
        log("PostgreSQL found but app_db missing - creating...")
        create_database("postgresql")
    if tools['mysql']['installed'] and not tools['mysql']['db_exists']:
        log("MySQL found but app_db missing - creating...")
        create_database("mysql")

    # Start ADB monitor thread
    if tools['adb']['installed']:
        adb_thread = threading.Thread(target=monitor_adb, daemon=True)
        adb_thread.start()
        log("ADB monitor started")

    # Main loop
    cycle = 0
    while running:
        cycle += 1
        try:
            # Re-check tools periodically
            if cycle % 10 == 0:
                tools = check_tools()
                log(f"Check: ADB={len(tools['adb_devices'])} devices | PG={'OK' if tools['postgresql']['installed'] else '-'} | MY={'OK' if tools['mysql']['installed'] else '-'}")

            # Check server health
            health = http_get(f"{SERVER}/api/health")
            if health and health.get("ok"):
                pass  # Server OK
            else:
                log("Server not responding - waiting...")

            # Report status to server
            http_post(f"{SERVER}/api/ro/state", {
                "deviceId": "ro_service",
                "mapName": "Service Active",
                "isAlive": True,
            })

        except Exception as e:
            log(f"Error: {e}")

        time.sleep(INTERVAL)

    log("Service stopped.")

if __name__ == "__main__":
    main()
