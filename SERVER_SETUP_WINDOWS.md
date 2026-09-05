# RO Bot Server Setup - Windows Server
# สำหรับเครื่องเซิร์ฟเวอร์ Windows (Windows Server 2019/2022 / Windows 10/11 Pro)

## ============= STEP 1: Install Prerequisites =============

### Node.js (LTS)
```powershell
# ผ่าน winget (Windows 10 22000+)
winget install OpenJS.NodeJS.LTS

# หรือตรวจสอบ
node --version  # v18+ required
npm --version
```

### PostgreSQL (Database)
```powershell
# ผ่าน installer
# https://www.postgresql.org/download/windows/
# ติดตั้งแล้วสร้าง database:

# ใช้ psql (จะอยู่ที่ C:\Program Files\PostgreSQL\16\bin)
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE app_db;"
```

### ADB / Android Platform Tools
```powershell
# ดาวน์โหลด: https://developer.android.com/studio/releases/platform-tools
# แตกไฟล์ไป C:\platform-tools
# เพิ่ม C:\platform-tools เข้า PATH:
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\platform-tools", "Machine")

# ตรวจสอบ
 adb version
```

## ============= STEP 2: Configure Environment =============

```powershell
# สร้าง .env
$envContent = @"
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/app_db
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
"@

# เขียนไฟล์
$envContent | Out-File -Encoding utf8 .env
```

**หมายเหตุ:** ถ้าต้องการให้เข้าถึงจากภายนอก (WAN) ต้องตั้ง `HOST=0.0.0.0` และเปิด Firewall port 3000

### Windows Firewall
```powershell
# เปิด port 3000 (Inbound)
New-NetFirewallRule -DisplayName "RO Bot Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# ถ้าต้องการเปิดสำหรับ WiFi device (ADB)
New-NetFirewallRule -DisplayName "RO Bot ADB" -Direction Inbound -LocalPort 5555 -Protocol TCP -Action Allow
```

## ============= STEP 3: Database Setup =============

```powershell
# ดึง dependencies
npm install

# Push schema (อาจต้องตอบ y)
echo y | npx drizzle-kit push

# หรือถ้าไม่ผ่าน:
# npx drizzle-kit push --force (ถ้ามี option)
```

## ============= STEP 4: Build & Start =============

```powershell
# Build
npm run build

# Start (background - ใช้ start แยก window)
Start-Process -WindowStyle Hidden -FilePath "cmd" -ArgumentList "/c","npm run start"

# หรือใช้ PM2 (ติดตั้งเสริม)
npm install -g pm2
pm2 start npm --name "ro-bot" -- run start
pm2 save
pm2 startup
```

## ============= STEP 5: Monitor Daemon =============

```powershell
# รัน ADB Monitor (Python ต้องติดตั้งแล้ว)
python ro_monitor.py --interval 5 --port 3000 --screenshot 30

# หรือ background:
Start-Process -WindowStyle Hidden -FilePath "python" -ArgumentList "ro_monitor.py","--interval","5","--port","3000"
```

## ============= MULTI-DEVICE WINDOWS =============

### เชื่อมต่อ USB หลายเครื่อง
```powershell
# ตรวจสอบ
adb devices -l

# จะได้รายการ:
# R5CR80XXXXX  device  model:R5 model:Pixel_7
# R5CR90XXXXX  device  model:R6 model:Galaxy_S23
```

### เชื่อมต่อ WiFi หลายเครื่อง
```powershell
# ต่อ USB ครั้งเดียว แล้วเปิด WiFi mode
adb tcpip 5555

# ได้ IP ของเครื่องจากมือถือ:
# Settings → WiFi → กดชื่อ WiFi → ดู IP (เช่น 192.168.1.101)

# ถอด USB
# ต่อ WiFi ทุกเครื่อง:
adb connect 192.168.1.101:5555
adb connect 192.168.1.102:5555

# ตรวจสอบ
adb devices
# 192.168.1.101:5555  device
# 192.168.1.102:5555  device
```

### ควบคุมผ่านเวป
- เปิด `http://localhost:3000` (หรือตาม IP ของเซิร์ฟเวอร์)
- แท็บ **📱 ADB** → กด **SCAN** → เลือกเครื่องจาก dropdown
- แต่ละเครื่องมี `deviceId` แยก → ควบคุมได้พร้อมกัน

## ============= NETWORK / REMOTE ACCESS =============

### ถ้าต้องการเข้าถึงจากภายนอก (Remote)

**ไม่แนะนำ** ให้เปิด `port 3000` ตรงไปยังอินเทอร์เน็ตโดยตรง 
ใช้วิธีเหล่านี้แทน:

1. **VPN / Tailscale / ZeroTier** — เชื่อมต่อเครื่องในเครือข่ายส่วนตัว
2. **Reverse Proxy (Nginx)** — ใช้กับ SSL + auth
3. **SSH Tunnel** — `ssh -L 3000:localhost:3000 user@server`

ตัวอย่าง Nginx config (Windows):
```nginx
# C:\nginx\conf\nginx.conf
server {
    listen 80;
    server_name ro-bot.mydomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## ============= APK AGENT (ไม่ต้อง ADB) =============

### ติดตั้งบนมือถือ Android (สำหรับทุกเครื่อง)
```bash
# 1. ติดตั้ง Termux (จาก F-Droid)
# 2. ใน Termux:
pkg update && pkg install python curl
pip3 install requests

# 3. ดึงไฟล์ ro_agent.py จากเซิร์ฟเวอร์ (SCP / Download)
# 4. รัน:
export RO_SERVER=http://YOUR_SERVER_IP:3000
export RO_DEVICE_ID=PHONE_001
nohup python3 ro_agent.py > /tmp/ro_agent.log 2>&1 &
```

### ข้อดีของ APK Agent:
- ไม่ต้องเปิด USB Debugging
- ไม่ต้องเสียบสาย USB
- รันได้หลายเครื่องพร้อมกัน
- ส่งข้อมูลผ่าน WiFi/Internet
- ใช้กับเครื่องที่อยู่ห่างไกลได้ (ถ้าเปิด port)

## ============= MAINTENANCE =============

### Restart Server
```powershell
# PM2 (แนะนำ)
pm2 restart ro-bot

# หรือหยุดแล้วเริ่มใหม่
Stop-Process -Name "node" -Force
Start-Process -WindowStyle Hidden -FilePath "npm" -ArgumentList "run","start"
```

### Update App
```powershell
git pull origin main
npm install
npm run build
pm2 restart ro-bot
```

### Backup Database
```powershell
# ใช้ pg_dump (ถ้าติดตั้ง PostgreSQL)
pg_dump -U postgres -d app_db -f C:\ro-backup\app_db_$(Get-Date -Format yyyyMMdd).sql
```

## ============= TROUBLESHOOTING WINDOWS =============

| ปัญหา | แก้ไข |
|-------|-------|
| `adb is not recognized` | เพิ่ม `C:\platform-tools` เข้า PATH |
| `unauthorized` | บนมือถือกด ALLOW / `adb kill-server` + `start-server` |
| `offline` | `adb disconnect` → `connect` ใหม่ / ตรวจสอบ WiFi |
| Server ไม่เริ่ม | ตรวจ `node --version` / `.env` / port 3000 |
| Screenshot ไม่อัปเดต | ตรวจสอบ `adb shell ls /sdcard/` / permission |
| Bot ไม่ทำงาน | Calibrate x,y ใน Dashboard / ตรวจสอบ `pidof` |
