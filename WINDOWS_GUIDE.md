# RO Bot Windows Client Setup Guide (Thai / English)

## เริ่มต้นบน Windows (10 / 11)

### 1. ติดตั้ง ADB
```powershell
# วิธี 1: ผ่าน Chocolatey (ถ้ามี)
choco install android-sdk

# วิธี 2: ดาวน์โหลดจาก Google
# https://developer.android.com/studio/releases/platform-tools
# แตกไฟล์ → วางที่ C:\platform-tools
# เพิ่ม C:\platform-tools เข้า PATH (System Environment Variables)

# ตรวจสอบ
adb version
```

### 2. เตรียมมือถือ Android
```text
Settings → About Phone → กด Build Number 7 ครั้ง → Developer Options
Settings → Developer Options → USB Debugging = ON
เชื่อมสาย USB → กด ALLOW บนมือถือ
```

### 3. เชื่อมต่อผ่าน ADB
```powershell
# USB โดยตรง
adb devices

# WiFi (ไม่ต้องใช้สาย)
# ต่อ USB ครั้งเดียว
adb tcpip 5555
adb shell ip route | Select-String "inet "
# ได้ IP (เช่น 192.168.1.100)
# ถอดสาย USB
adb connect 192.168.1.100:5555
adb devices
```

### 4. รัน RO Bot Server + Client
```powershell
# Terminal 1: Server
npm run build
npm run start

# Terminal 2: Client (เปิด Browser + สแกนเครื่อง)
.\ro_client.bat [DEVICE_ID] 3000
```

### 5. ควบคุมผ่าน Web
- ไปที่ `http://localhost:3000`
- แท็บ **📱 ADB** → กด **SCN** → เลือกเครื่อง
- แท็บ **🎮 GAME CTRL** → คลิกที่หน้าจอเพื่อควบคุม
- แท็บ **🤖 BOT** → เปิด Auto Attack / Farm / Buff

### 6. Multi-Device บน Windows
```powershell
# ต่อหลายเครื่องพร้อมกัน (USB + WiFi)
adb devices
# ได้:
# R5CR80XXXXX  device        (USB)
# 192.168.1.101:5555  device  (WiFi Phone 1)
# 192.168.1.102:5555  device  (WiFi Phone 2)

# ควบคุมแต่ละเครื่องผ่านเวป (เลือกจาก dropdown)
# แต่ละเครื่องมี screen calibration ของตัวเอง
```

### 7. APK Agent บน Android (ไม่ต้อง ADB)
```bash
# ติดตั้ง Termux: https://f-droid.org/packages/com.termux/
# ใน Termux:
pkg install python curl
pip3 install requests

# รัน Agent (ส่งข้อมูลไปเซิร์ฟเวอร์)
export RO_SERVER=http://YOUR_SERVER_IP:3000
nohup python3 ro_agent.py > /tmp/ro_agent.log 2>&1 &

# ตรวจสอบ
ps aux | grep ro_agent
curl http://localhost:3000/api/devices  # จะเห็นอุปกรณ์ใหม่
```

### ปัญหาที่พบบ่อย
| ปัญหา | แก้ไข |
|-------|-------|
| `adb not recognized` | เพิ่ม `C:\platform-tools` เข้า PATH |
| `unauthorized` | บนมือถือกด ALLOW + ลบ `~/.android/adbkey*` แล้ว reconnect |
| `device offline` | `adb kill-server` → `adb start-server` → reconnect |
| Screen ไม่ตรง | ปรับ `screenW/screenH` ใน Dashboard ตามเครื่อง |
| Bot ไม่ตอบสนอง | ตรวจสอบว่า game running (ADB `pidof` ปรากฏ) |
