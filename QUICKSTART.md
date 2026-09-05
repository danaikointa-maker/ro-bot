# RO Bot - Quick Start Guide

## วิธีติดตั้ง (3 วิธี)

### Linux / macOS (1 command)
```bash
bash install_linux.sh
# เปิด browser → http://localhost:3000/setup
```

### Windows (double-click)
```
install_windows.bat
# เปิด browser → http://localhost:3000/setup
```

### ทั้งหมด (Linux/macOS/WSL)
```bash
bash install_universal.sh
# เปิด browser → http://localhost:3000/setup
```

## Setup Wizard ทำอะไร

เปิด `http://localhost:3000/setup` แล้:

### Step 1: Tools Check
- ตรวจ Node.js, npm, ADB, Python, PostgreSQL, MySQL, Tesseract, Git
- แสดงสถานะ ✅ OK / ❌ MISSING
- ลิงกโหลด + คำสังติดตั้งสำหรับทุก tool ที่ขาด

### Step 2: Database
- เลือก PostgreSQL หรือ MySQL
- ใส่ host / port / user / password
- กด **Create app_db** → สร้าง DB อัตโนมัติ
- แสดงคำสัง `npx drizzle-kit push`

### Step 3: Done
- แสดง Quick Start commands
- ลิงก→ Dashboard

## Python3 Background Service

```bash
# รัน foreground
python3 ro_service.py

# รัน background (แนะนำ)
nohup python3 ro_service.py > /tmp/ro_service.log 2>&1 &

# ตรวจสอบ
tail -f /tmp/ro_service.log

# หยุด
pkill -f ro_service.py
```

### ro_service.py ทำอะไร
- ตรวจสอบ tools ทุก 30 วินาที
- ติดตั้ง Python libs ที่ขาดอัตโนมัติ
- สร้าง DB ถ้าเจอแต่ยังไม่มี app_db
- Monitor ADB devices → ส่งไป server
- รายงาน status ไป server
- ทำงานเงียบๆ เบื้องหลัง

## เชื่อมต่อ Android

### USB
```bash
adb devices
```

### WiFi
```bash
adb tcpip 5555
adb connect 192.168.1.100:5555
```

### APK Agent (ไม่ต้อง ADB)
```bash
# ติดตั้ง Termux บน Android
pkg install python curl
pip3 install requests
RO_SERVER=http://SERVER_IP:3000 python3 ro_agent.py
```

## Dashboard

เปิด `http://localhost:3000` →

- **Connect** tab → เชื่อม ADB / WiFi / APK
- **Control** tab → Screen mirror + tap/swipe/skill
- **Bot** tab → Auto attack/farm/buff/pot
- **Macro** tab → Waypoints + farm path
- **System** tab → Login PIN, Profiles, Anti-Detect, Safety, Schedule, Stats
