# RO Bot Multi-Device Connection Guide
# สรุปการเชื่อมต่อเครื่องมือถือหลายเครื่องผ่าน ADB / Network / APK

## ============================================
# 1. ADB USB (Direct) - เครื่องเดียวต่อสาย
# ============================================
# ต่อสาย USB → ติดตั้ง Driver → adb devices
# รองรับ: 1 เครื่องต่อสาย / หลายเครื่องต่อหลายสาย

echo "=== ADB USB Connection ==="
echo "Device: $(adb devices 2>/dev/null | grep device | awk '{print $1}')"
echo "Status: Connected via USB cable"

# For multiple USB devices - use -s flag
# adb -s R5CR80XXXXX shell input tap 540 960

## ============================================
# 2. ADB WiFi (Wireless) - หลายเครื่องได้
# ============================================
# ต้องต่อ USB ก่อนครั้งหนึ่งเพื่อเปิด tcpip

echo "=== ADB WiFi Setup ==="
# Step 1: Connect via USB first
adb tcpip 5555
# Step 2: Get IP
IP=$(adb shell ip route 2>/dev/null | head -1 | awk '{print $9}')
echo "Phone IP: $IP"
# Step 3: Disconnect USB
# Step 4: Connect wireless
adb connect ${IP}:5555
echo "WiFi Connected: ${IP}:5555"

# Now support multiple wireless connections
# adb devices shows all connected
# To target specific: adb -s ${IP}:5555 shell ...

## ============================================
# 3. Network/API (APK Agent) - หลายเครื่องพร้อมกัน
# ============================================
# สร้าง APK Agent บนมือถือแต่ละเครื่อง
# Agent ส่งข้อมูลไปยังเซิร์ฟเวอร์ทุก 10 วินาที
# ไม่ต้องใช้ ADB เลย - เชื่อมผ่าน WiFi/Internet

# Each device reports:
# - deviceId (unique per phone)
# - screenW, screenH
# - hp, sp, position, map
# - connectionType: "apk"

# Server can handle multiple devices simultaneously
# Database: devices table stores each device state

## ============================================
# 4. How many devices can connect?
# ============================================
# ADB USB: Limited by USB ports (typically 1-4)
# ADB WiFi: Limited by network (theoretically unlimited, practically 5-10)
# APK Agent: Unlimited (each phone connects independently via HTTP)
# Server database: Unlimited rows (PostgreSQL)

## ============================================
# 5. Multi-device control example
# ============================================
# Device 1: Android Phone A (IP 192.168.1.10)
# Device 2: Android Phone B (IP 192.168.1.11)
# Device 3: Android Phone C (IP 192.168.1.12)

# Control specific device from web:
# 1. Select device from dropdown (deviceId = IP or ADB serial)
# 2. Send command: adb -s 192.168.1.10:5555 shell input tap 540 960
# 3. Or use APK Agent: POST /api/ro/state {deviceId: "PHONE_A", ...}

# For simultaneous control:
# - Different screens = different coordinates needed
# - Must calibrate each device individually (screenW, screenH)
# - Bot config stored per device in database
