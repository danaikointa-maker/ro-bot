# RO Bot Multi-Device Server — Installation Files (New)

## === NEW FILES CREATED ===

### Universal Install
- `install_universal.sh` — ติดตั้งอัตโนมัติ (Linux/macOS/Windows/WSL)
- `install.sh` — Linux/macOS (เดิม)
- `install_windows.ps1` — Windows PowerShell (ใหม่)

### Windows Client
- `ro_client.bat` — Launch client บน Windows
- `ro_adb.ps1` — PowerShell ADB command
- `WINDOWS_SETUP.md` — คู่มือติดตั้ง Windows
- `WINDOWS_GUIDE.md` — คู่มือละเอียด Thai/English
- `SERVER_SETUP_WINDOWS.md` — Server setup Windows

### Server Tools
- `ro_monitor.py` — ADB Monitor Daemon (Python)
- `ro_agent.py` — APK Agent for Android (Python)
- `MULTI_DEVICE_GUIDE.md` — Multi-device connection guide

### API Endpoints (New)
- `POST /api/ro/queue` — Queue command to device
- `GET /api/ro/poll` — Device polls for commands
- `POST /api/ro/command-done` — Device reports command done
- `POST /api/ro/ro` — Enhanced ADB command with Windows support

### Database
- `.env.db` — Config for PostgreSQL / MySQL choice
- Schema supports both DB types (Drizzle ORM)

## === HOW TO USE ===

### Linux / macOS / WSL
```bash
chmod +x install_universal.sh
./install_universal.sh
# เลือก DB: PostgreSQL / MySQL
# แล้วรอสักครู่...

# เริ่มเซิร์ฟเวอร์
npm run start

# เริ่ม Monitor
python3 ro_monitor.py --interval 5 --port 3000

# จัดการ Android (ADB)
adb connect 192.168.1.100:5555
```

### Windows (PowerShell)
```powershell
# ต้องเป็น Admin (ถ้าต้องการติดตั้ง ADB / PostgreSQL)
.\install_windows.ps1
# หรือใช้ .\ro_client.bat สำหรับ client
```

### Android (APK Agent — ไม่ต้อง ADB)
```bash
# ติดตั้ง Termux → pkg install python curl
# ดาวน์โหลด/สร้าง ro_agent.py
export RO_SERVER=http://YOUR_SERVER_IP:3000
nohup python3 ro_agent.py > /tmp/ro_agent.log 2>&1 &
```

## === MULTI-DEVICE ===

| Device | Method | Command |
|--------|--------|---------|
| Phone A (USB) | ADB | `adb devices` → เลือก -> `adb -s R5...` |
| Phone B (WiFi) | ADB | `adb connect 192.168.1.101:5555` |
| Phone C (Network) | APK Agent | `python3 ro_agent.py` บนมือถือ |

ใน Dashboard → เลือกจาก `deviceId` dropdown → ควบคุมแยกต่อเครื่อง
