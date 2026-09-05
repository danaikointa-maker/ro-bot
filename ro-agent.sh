#!/usr/bin/env bash
# Android APK Agent Template for RO Bot
# Install this on Android to send data to server without ADB
# This is a Python script using Android's Tasker/Tasker-like environment
# Or can be compiled to APK using Kivy/Termux

# For Termux (Android terminal app):
# 1. Install Termux from F-Droid
# 2. Run: pkg install python curl
# 3. Copy agent.py to ~/ro_agent/
# 4. Configure SERVER_URL
# 5. Run: nohup python agent.py > /dev/null 2>&1 &

SERVER_URL="http://YOUR_SERVER_IP:3000/api/ro/state"
DEVICE_ID="ANDROID_$(cat /system/build.prop 2>/dev/null | grep ro.product.model | cut -d= -f2 | tr -d ' ' || echo 'unknown')"

# Read screen dimensions
SCREEN_W=$(wm size 2>/dev/null | grep -oE '[0-9]+x[0-9]+' | cut -d'x' -f1 || echo 1080)
SCREEN_H=$(wm size 2>/dev/null | grep -oE '[0-9]+x[0-9]+' | cut -d'x' -f2 || echo 2400)

echo "RO Agent started: $DEVICE_ID (${SCREEN_W}x${SCREEN_H})"

# Send initial connection
curl -s -X POST "$SERVER_URL" \
    -H "Content-Type: application/json" \
    -d "{\"deviceId\":\"$DEVICE_ID\",\"mapName\":\"Unknown\",\"screenW\":$SCREEN_W,\"screenH\":$SCREEN_H,"connectionType":"apk"}"

# Monitor loop (every 10 seconds)
while true; do
    # Check if Ragnarok is running
    PID=$(pidof com.ggv.roworldsea.aos 2>/dev/null)
    
    if [ -n "$PID" ]; then
        # Read battery info
        BATTERY=$(dumpsys battery 2>/dev/null | grep -E "level:|temperature:" | tr '\n' ';')
        
        # Read approximate position from logs or screen state
        # (In real implementation, use OCR or accessibility service)
        
        # Send state to server
        curl -s -X POST "$SERVER_URL" \
            -H "Content-Type: application/json" \
            -d "{\"deviceId\":\"$DEVICE_ID\",\"hp\":100,\"maxHp\":100,\"mapName\":\"Monitoring\",\"isAlive\":true,"connectionType":"apk"}" > /dev/null 2>&1
    fi
    
    sleep 10
done
