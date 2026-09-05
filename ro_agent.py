#!/usr/bin/env python3
"""
RO Bot APK Agent — รันบนมือถือ Android ผ่าน Termux
ส่งข้อมูลเกมไปยังเซิร์ฟเวอร์ผ่าน HTTP (ไม่ต้องใช้ ADB)

ติดตั้ง:
  1. ติดตั้ง Termux จาก F-Droid
  2. pkg install python curl
  3. pip3 install requests
  4. แก้ SERVER_URL ด้านล่าง
  5. python3 ro_agent.py

หรือรันเป็น background service:
  nohup python3 ro_agent.py > /tmp/ro_agent.log 2>&1 &
"""

import json
import time
import os
import sys
import subprocess
import threading
import signal
from datetime import datetime

try:
    import requests
except ImportError:
    # Fallback to curl if requests not available
    requests = None

# ============ CONFIG ============
SERVER_URL = os.environ.get("RO_SERVER", "http://192.168.1.100:3000")
RO_PACKAGE = "com.ggv.roworldsea.aos"
DEVICE_ID = os.environ.get("RO_DEVICE_ID", "")
POLL_INTERVAL = int(os.environ.get("RO_POLL_INTERVAL", "5"))  # seconds
SCREENSHOT_INTERVAL = int(os.environ.get("RO_SCREENSHOT_INTERVAL", "30"))  # seconds
SEND_SCREENSHOT = os.environ.get("RO_SEND_SCREENSHOT", "0") == "1"

# ============ HELPERS ============
running = True

def signal_handler(sig, frame):
    global running
    print("\n[AGENT] Stopping...")
    running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def shell(cmd, timeout=10):
    """Execute shell command and return output"""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return result.stdout.strip()
    except Exception as e:
        return f"ERR:{e}"

def http_post(url, data, files=None):
    """Send HTTP POST to server"""
    try:
        if requests:
            if files:
                r = requests.post(url, files=files, data=data, timeout=10)
            else:
                r = requests.post(url, json=data, timeout=10)
            return r.status_code, r.text[:200]
        else:
            # Fallback: use curl
            if files:
                cmd = f'curl -s -X POST "{url}" -F "screenshot=@{files.get("screenshot", ("",))[1]}"'
            else:
                json_str = json.dumps(data)
                cmd = f'curl -s -X POST "{url}" -H "Content-Type: application/json" -d \'{json_str}\''
            result = shell(cmd, timeout=15)
            return 200, result
    except Exception as e:
        return 0, str(e)

def get_device_id():
    """Get unique device ID"""
    if DEVICE_ID:
        return DEVICE_ID
    model = shell("getprop ro.product.model")
    serial = shell("getprop ro.serialno")
    if not serial:
        serial = shell("getprop ro.boot.serialno")
    if not serial:
        serial = hex(hash(model + shell("getprop ro.build.display.id")))[:12]
    return f"{model}_{serial}".replace(" ", "_")

def get_device_info():
    """Collect device information"""
    return {
        "model": shell("getprop ro.product.model"),
        "brand": shell("getprop ro.product.brand"),
        "android_version": shell("getprop ro.build.version.release"),
        "sdk": shell("getprop ro.build.version.sdk"),
        "screen_w": shell("wm size | grep -oE '[0-9]+' | head -1") or "1080",
        "screen_h": shell("wm size | grep -oE '[0-9]+' | tail -1") or "2400",
        "battery_level": shell("dumpsys battery | grep level | cut -d: -f2 | tr -d ' '") or "0",
        "battery_temp": shell("dumpsys battery | grep temperature | cut -d: -f2 | tr -d ' '") or "0",
        "wifi_ip": shell("ip addr show wlan0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1"),
        "memory_total": shell("cat /proc/meminfo | grep MemTotal | awk '{print $2}'") or "0",
        "memory_free": shell("cat /proc/meminfo | grep MemAvailable | awk '{print $2}'") or "0",
    }

def check_game_running():
    """Check if Ragnarok is running"""
    pid = shell(f"pidof {RO_PACKAGE}")
    return bool(pid and not pid.startswith("ERR")), pid

def take_screenshot():
    """Take screenshot and save to temp file"""
    path = "/sdcard/ro_bot_screen.png"
    shell(f"screencap -p {path}")
    if os.path.exists(path):
        return path
    return None

def read_game_state():
    """
    Read game state from the device.
    In production, this would use:
    1. OCR on screenshot (need tesseract)
    2. Accessibility service (need custom APK)
    3. Memory reading (need root)
    
    For now, returns what we can detect from shell.
    """
    game_running, pid = check_game_running()
    
    state = {
        "isAlive": game_running,
        "inCombat": False,
        "hp": 0, "maxHp": 0,
        "sp": 0, "maxSp": 0,
        "baseLevel": 0, "jobLevel": 0,
        "zeny": 0,
        "posX": 0, "posY": 0,
        "mapName": "",
        "jobName": "",
        "guildName": "",
        "partyName": "",
        "targetName": "",
        "targetHp": 0, "targetMaxHp": 0,
    }
    
    if game_running:
        # Try to read from game logcat
        logcat = shell(f"logcat -d -t 50 -s Unity ActivityManager PackageManager | grep -i 'ragnarok\\|roworld\\|hp\\|damage\\|map\\|level'", timeout=5)
        if logcat and not logcat.startswith("ERR"):
            # Parse useful info from logcat
            for line in logcat.split("\n"):
                line = line.lower()
                if "entering map" in line or "map:" in line:
                    state["mapName"] = "detected_from_log"
                if "level up" in line or "base level" in line:
                    state["baseLevel"] = 1  # placeholder
    
    return state

def execute_touch(x, y):
    """Execute touch command locally"""
    return shell(f"input tap {x} {y}")

def execute_swipe(x1, y1, x2, y2, duration=300):
    """Execute swipe command locally"""
    return shell(f"input swipe {x1} {y1} {x2} {y2} {duration}")

# ============ COMMAND POLLER ============
def poll_commands(dev_id):
    """Poll server for pending commands and execute them"""
    while running:
        try:
            url = f"{SERVER_URL}/api/ro/poll?device={dev_id}"
            if requests:
                r = requests.get(url, timeout=5)
                cmds = r.json() if r.status_code == 200 else []
            else:
                result = shell(f'curl -s "{url}"', timeout=10)
                cmds = json.loads(result) if result and not result.startswith("ERR") else []
            
            for cmd in cmds:
                action = cmd.get("action", "")
                params = cmd.get("params", {})
                
                if action == "tap":
                    execute_touch(params.get("x", 540), params.get("y", 960))
                elif action == "swipe":
                    execute_swipe(
                        params.get("x1", 0), params.get("y1", 0),
                        params.get("x2", 0), params.get("y2", 0),
                        params.get("duration", 300)
                    )
                elif action == "keyevent":
                    shell(f"input keyevent {params.get('keycode', 66)}")
                elif action == "screenshot":
                    path = take_screenshot()
                    if path:
                        http_post(f"{SERVER_URL}/api/ro/screen", 
                                  {"deviceId": dev_id},
                                  files={"screenshot": ("screen.png", open(path, "rb"), "image/png")} if path else None)
                
                # Report completion
                http_post(f"{SERVER_URL}/api/ro/command-done", {
                    "deviceId": dev_id,
                    "commandId": cmd.get("id", ""),
                    "status": "completed"
                })
        except Exception as e:
            print(f"[CMD] Error: {e}")
        
        time.sleep(POLL_INTERVAL)

# ============ MAIN ============
def main():
    dev_id = get_device_id()
    print(f"""
╔══════════════════════════════════════════╗
║         RO Bot APK Agent v2.0            ║
║  Ragnarok: The New World Controller      ║
╠══════════════════════════════════════════╣
║  Device:   {dev_id[:30]:<30s}║
║  Server:   {SERVER_URL[:30]:<30s}║
║  Package:  {RO_PACKAGE[:30]:<30s}║
║  Poll:     {POLL_INTERVAL}s{' ' * 27}║
╚══════════════════════════════════════════╝
    """)
    
    # Register device with server
    info = get_device_info()
    print(f"[INFO] Device: {info['model']} ({info['brand']})")
    print(f"[INFO] Android {info['android_version']} (SDK {info['sdk']})")
    print(f"[INFO] Screen: {info['screen_w']}x{info['screen_h']}")
    print(f"[INFO] Battery: {info['battery_level']}% ({info['battery_temp']}°)")
    print(f"[INFO] WiFi IP: {info['wifi_ip']}")
    
    # Register with server
    status, resp = http_post(f"{SERVER_URL}/api/devices", {
        "deviceId": dev_id,
        "name": f"{info['brand']} {info['model']}",
        "model": info['model'],
        "connectionType": "apk",
        "screenW": int(info['screen_w']) if info['screen_w'].isdigit() else 1080,
        "screenH": int(info['screen_h']) if info['screen_h'].isdigit() else 2400,
    })
    print(f"[REG] Server response: {status} {resp[:80]}")
    
    # Start command poller thread
    cmd_thread = threading.Thread(target=poll_commands, args=(dev_id,), daemon=True)
    cmd_thread.start()
    
    # Main state reporting loop
    screenshot_timer = 0
    while running:
        try:
            # Read game state
            state = read_game_state()
            game_running, pid = check_game_running()
            
            # Build report
            report = {
                "deviceId": dev_id,
                **state,
                "batteryLevel": info.get("battery_level", "0"),
                "memoryFree": info.get("memory_free", "0"),
                "gamePid": pid if game_running else "",
                "connectionType": "apk",
                "updatedAt": datetime.now().isoformat(),
            }
            
            # Send state to server
            status, resp = http_post(f"{SERVER_URL}/api/ro/state", report)
            
            # Periodic screenshot
            if SEND_SCREENSHOT:
                screenshot_timer += POLL_INTERVAL
                if screenshot_timer >= SCREENSHOT_INTERVAL:
                    screenshot_timer = 0
                    path = take_screenshot()
                    if path:
                        http_post(f"{SERVER_URL}/api/ro/screen", 
                                  {"deviceId": dev_id})
            
            # Update device info periodically
            if int(time.time()) % 60 < POLL_INTERVAL:
                info = get_device_info()
            
            # Status display
            game_status = "🎮 GAME ON" if game_running else "💤 IDLE"
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {game_status} "
                  f"HP:{state['hp']}/{state['maxHp']} "
                  f"Map:{state['mapName'] or '?'} "
                  f"Server:{status}")
            
        except Exception as e:
            print(f"[ERR] {e}")
        
        time.sleep(POLL_INTERVAL)
    
    print("[AGENT] Stopped.")

if __name__ == "__main__":
    main()
