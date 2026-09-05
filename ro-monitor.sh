#!/bin/bash
# RO Bot Auto-Monitor Tool
# Monitors connected Android devices running Ragnarok: The New World
# Usage: bash ro-monitor.sh [deviceId] [interval_seconds]

DEVICE="${1:-}"
INTERVAL="${2:-5}"
LOGFILE="/tmp/ro_monitor_$(date +%Y%m%d_%H%M%S).log"
PKG="com.ggv.roworldsea.aos"

echo "========================================" >> "$LOGFILE"
echo "RO Bot Monitor Started: $(date)" >> "$LOGFILE"
echo "Target Package: $PKG" >> "$LOGFILE"
echo "Device: ${DEVICE:-auto-detect}" >> "$LOGFILE"
echo "Interval: ${INTERVAL}s" >> "$LOGFILE"
echo "========================================" >> "$LOGFILE"

# Function: Check device connection
check_device() {
    if [ -n "$DEVICE" ]; then
        adb -s "$DEVICE" shell echo "OK" 2>/dev/null && echo "connected" || echo "disconnected"
    else
        adb devices 2>/dev/null | grep -v "List of" | grep "device" | head -1 | awk '{print $1}'
    fi
}

# Function: Read game state from device (simulated - real implementation needs OCR or APK)
read_state() {
    local dev=$1
    # Check if game is running
    local running=$(adb -s "$dev" shell pidof "$PKG" 2>/dev/null | tr -d '\r')
    if [ -n "$running" ]; then
        echo "GAME_RUNNING"
    else
        echo "GAME_NOT_RUNNING"
    fi
    
    # Try to get battery
    local battery=$(adb -s "$dev" shell dumpsys battery 2>/dev/null | grep -E "level:|temperature:" | tr '\n' ';')
    echo "BATTERY:${battery:-unknown}"
    
    # Screen size
    local size=$(adb -s "$dev" shell wm size 2>/dev/null | grep -oE '[0-9]+x[0-9]+' || echo "unknown")
    echo "SCREEN:${size:-unknown}"
}

# Main loop
while true; do
    DEV=$(check_device)
    
    if [ -z "$DEV" ]; then
        echo "[$(date '+%H:%M:%S')] WARNING: No ADB device found" >> "$LOGFILE"
        echo "[$(date '+%H:%M:%S')] Try: adb connect 192.168.1.100:5555" >> "$LOGFILE"
    else
        echo "[$(date '+%H:%M:%S')] Device: $DEV" >> "$LOGFILE"
        
        # Check connectivity
        STATE=$(read_state "$DEV")
        
        # Log to server via curl (if server is running)
        curl -s -X POST http://localhost:3000/api/ro/state \
            -H "Content-Type: application/json" \
            -d "{\"deviceId\":\"$DEV\",\"mapName\":\"Monitoring\",\"isAlive\":true,\"updatedAt\":\"$(date -Iseconds)\"}" 2>/dev/null || true
        
        echo "[$(date '+%H:%M:%S')] State: $STATE" >> "$LOGFILE"
    fi
    
    sleep "$INTERVAL"
done
