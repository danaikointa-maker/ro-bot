#!/usr/bin/env python3
"""
RO Bot ADB Monitor — รันบนเซิร์ฟเวอร์
ตรวจสอบอุปกรณ์ที่เชื่อมต่อผ่าน ADB ทุก N วินาที
ดึงข้อมูลเกม ส่ง screenshot อัปเดทฐานข้อมูล

Usage:
  python3 ro_monitor.py [--interval 5] [--screenshot 10] [--port 3000]
"""

import subprocess
import json
import time
import sys
import os
import argparse
import signal
from datetime import datetime

SERVER = "http://localhost"
PORT = 3000
RO_PKG = "com.ggv.roworldsea.aos"
running = True

def sig_handler(s, f):
    global running
    running = False
    print("\n[MONITOR] Stopping...")

signal.signal(signal.SIGINT, sig_handler)
signal.signal(signal.SIGTERM, sig_handler)

def shell(cmd, timeout=15):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip(), r.returncode
    except:
        return "", 1

def adb(device_id, cmd, timeout=15):
    if device_id:
        return shell(f"adb -s {device_id} {cmd}", timeout)
    return shell(f"adb {cmd}", timeout)

def get_connected_devices():
    """Get list of ADB-connected devices"""
    out, rc = shell("adb devices -l", timeout=10)
    if rc != 0:
        return []
    devices = []
    for line in out.split("\n"):
        line = line.strip()
        if not line or "List of devices" in line:
            continue
        parts = line.split()
        if len(parts) >= 2 and parts[1] == "device":
            dev_id = parts[0]
            info = {}
            for p in parts[2:]:
                if ":" in p:
                    k, v = p.split(":", 1)
                    info[k] = v
            devices.append({
                "id": dev_id,
                "model": info.get("model", ""),
                "product": info.get("product", ""),
                "device": info.get("device", ""),
                "transport_id": info.get("transport_id", ""),
            })
    return devices

def register_device(dev):
    """Register device with server"""
    data = {
        "deviceId": dev["id"],
        "name": dev.get("model", "") or dev["id"],
        "model": dev.get("model", ""),
        "connectionType": "adb",
    }
    shell(f'curl -s -X POST http://localhost:{PORT}/api/devices -H "Content-Type: application/json" -d \'{json.dumps(data)}\'', timeout=10)

def check_game(dev_id):
    """Check if Ragnarok is running on device"""
    out, _ = adb(dev_id, f"shell pidof {RO_PKG}")
    return bool(out and "not found" not in out.lower() and not out.startswith("error")), out

def get_device_info(dev_id):
    """Get device info"""
    model, _ = adb(dev_id, "shell getprop ro.product.model")
    android, _ = adb(dev_id, "shell getprop ro.build.version.release")
    size, _ = adb(dev_id, "shell wm size")
    battery, _ = adb(dev_id, "shell dumpsys battery | grep -E 'level:|temperature:|status:'")
    mem, _ = adb(dev_id, "shell cat /proc/meminfo | head -2")
    return {
        "model": model,
        "android": android,
        "screen": size,
        "battery": battery,
        "memory": mem,
    }

def take_screenshot(dev_id):
    """Take screenshot from device"""
    adb(dev_id, "shell screencap -p /sdcard/ro_screen.png", timeout=10)
    adb(dev_id, "pull /sdcard/ro_screen.png /tmp/ro_screen_" + dev_id.replace(":", "_") + ".png", timeout=15)

def update_game_state(dev_id, game_running, pid):
    """Send game state to server"""
    data = {
        "deviceId": dev_id,
        "isAlive": game_running,
        "inCombat": False,
        "mapName": "Monitoring" if game_running else "",
    }
    shell(f'curl -s -X POST http://localhost:{PORT}/api/ro/state -H "Content-Type: application/json" -d \'{json.dumps(data)}\'', timeout=10)

def main():
    global PORT, running
    
    parser = argparse.ArgumentParser(description="RO Bot ADB Monitor")
    parser.add_argument("--interval", type=int, default=5, help="Poll interval in seconds")
    parser.add_argument("--screenshot", type=int, default=30, help="Screenshot interval in seconds")
    parser.add_argument("--port", type=int, default=3000, help="Server port")
    args = parser.parse_args()
    
    PORT = args.port
    
    print(f"""
╔══════════════════════════════════════════╗
║       RO Bot ADB Monitor v2.0            ║
║  Multi-Device Ragnarok Monitor           ║
╠══════════════════════════════════════════╣
║  Server:    http://localhost:{PORT:<13}║
║  Interval:  {args.interval}s{' ' * 25}║
║  Screenshot: {args.screenshot}s{' ' * 24}║
║  Package:   {RO_PKG[:27]:<27s}║
╚══════════════════════════════════════════╝
    """)
    
    known_devices = set()
    ss_timer = 0
    
    while running:
        try:
            # Scan for connected devices
            devices = get_connected_devices()
            
            if not devices:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️  No ADB devices. Connect via: adb connect IP:5555")
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 📱 {len(devices)} device(s) connected")
                
                for dev in devices:
                    dev_id = dev["id"]
                    
                    # Register new devices
                    if dev_id not in known_devices:
                        print(f"[NEW] Device: {dev_id} ({dev.get('model', '?')})")
                        register_device(dev)
                        known_devices.add(dev_id)
                    
                    # Check game status
                    game_running, pid = check_game(dev_id)
                    status = "🎮 GAME ON" if game_running else "💤 IDLE"
                    
                    # Get device info
                    info = get_device_info(dev_id)
                    
                    # Update server
                    update_game_state(dev_id, game_running, pid)
                    
                    # Screenshot
                    ss_timer += args.interval
                    if ss_timer >= args.screenshot:
                        ss_timer = 0
                        if game_running:
                            take_screenshot(dev_id)
                            print(f"  [{dev_id[:20]}] {status} 📸 screenshot saved")
                        else:
                            print(f"  [{dev_id[:20]}] {status}")
                    else:
                        print(f"  [{dev_id[:20]}] {status} Bat:{info['battery'][:30]}")
            
            # Check for disconnected devices
            current_ids = {d["id"] for d in devices}
            disconnected = known_devices - current_ids
            for dev_id in disconnected:
                print(f"[DC] Device disconnected: {dev_id}")
                known_devices.discard(dev_id)
            
        except Exception as e:
            print(f"[ERR] {e}")
        
        time.sleep(args.interval)
    
    print("[MONITOR] Stopped.")

if __name__ == "__main__":
    main()
