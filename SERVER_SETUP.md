# RO Bot Server Installation Guide
# คู่มือการติดตั้งเซิร์ฟเวอร์ RO Bot แบบเต็มรูปแบบ

## ============= OVERVIEW =============

ระบบประกอบด้วย 3 ส่วนหลัก:
1. Web Dashboard (Next.js) - หน้าเวปควบคุม
2. ADB Bridge (Node.js API) - เชื่อมต่อ Android ผ่าน ADB
3. Database (PostgreSQL + Drizzle ORM) - เก็บข้อมูล

## ============= SYSTEM REQUIREMENTS =============

### Minimum
- Node.js 18+
- PostgreSQL 14+
- ADB (Android Platform Tools)
- Linux / Windows / macOS

### Recommended (Production)
- 2 vCPU, 4GB RAM
- SSD Storage (สำหรับ screenshot cache)
- 100Mbps Network (ถ้าใช้ WiFi หลายเครื่อง)

## ============= INSTALLATION STEPS =============

### 1. Clone / Setup Project

```bash
# Linux / macOS / WSL
mkdir -p /opt/ro-bot && cd /opt/ro-bot
git clone <repo-url> .  # หรือ copy ไฟล์โปรเจกต์

# Windows PowerShell
New-Item -ItemType Directory -Force -Path "C:\ro-bot"
Set-Location "C:\ro-bot"
# Copy files or git clone
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Database

```bash
# สร้าง database
createdb -U postgres app_db
# หรือใช้ pgAdmin / psql

# สร้าง .env (จาก template)
cp .env.example .env
# แก้ DATABASE_URL ตามการตั้งค่า
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db" >> .env
```

### 4. Apply Database Schema

```bash
npx drizzle-kit push
# หรือถ้าไม่ผ่าน:
echo "y" | npx drizzle-kit push
```

### 5. Configure Server Environment

```bash
# .env file
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
# ถ้าต้องการให้เข้าถึงจากภายนอก:
NEXT_PUBLIC_SERVER_URL=http://your-server-ip:3000
```

### 6. Build Production

```bash
npm run build
```

### 7. Start Server (Production)

```bash
# แบบง่าย (development mode - ไม่แนะนำ production)
npm run dev

# แบบ production (ใช้ next start)
npm run build
npm run start

# แบบ background (Linux/macOS)
nohup npm run start > /tmp/ro-server.log 2>&1 &

# แบบ systemd (Linux production)
sudo ln -s /opt/ro-bot/ro-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ro-server
sudo systemctl start ro-server
```

### 8. Configure ADB Access

```bash
# ติดตั้ง Android Platform Tools
# Linux:
sudo apt install android-tools-adb android-tools-fastboot
# macOS:
brew install android-platform-tools
# Windows: ดู WINDOWS_SETUP.md

# เพิ่ม udev rules (Linux) เพื่อไม่ต้องใช้ sudo
# เพิ่ม user เข้า group plugdev
sudo usermod -a -G plugdev $USER

# ตรวจสอบ ADB
adb version
adb devices
```

### 9. Start Monitoring

```bash
# ADB Monitor (ตรวจจับเครื่องและ screenshot)
python3 ro_monitor.py --interval 5 --screenshot 30 --port 3000

# หรือแบบ background
nohup python3 ro_monitor.py > /tmp/ro-monitor.log 2>&1 &

# ตรวจสอบ log
cat /tmp/ro-monitor.log
```

## ============= PRODUCTION DEPLOYMENT =============

### ด้วย Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name ro-bot.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # เพิ่มสำหรับ upload screenshot ขนาดใหญ่
    client_max_body_size 50M;
}
```

### ด้วย Docker (ถ้าต้องการ)

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache postgresql-client python3 curl
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start"]
```

```bash
docker build -t ro-bot .
docker run -d -p 3000:3000 --name ro-bot \
  -e DATABASE_URL=postgresql://... \
  -v /data/ro-bot:/app/data \
  ro-bot
```

### ด้วย PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start npm --name "ro-bot" -- run start
pm2 save
pm2 startup
```

## ============= SECURITY =============

### 1. Database
- ใช้ strong password
- จำกัด access IP
- ไม่เปิด port 5432 ภายนอก (ใช้ localhost / VPN)

### 2. ADB
- ADB ควรใช้ใน local network เท่านั้น
- ถ้าต้องการ remote access: ใช้ VPN / SSH tunnel
- ไม่เปิด ADB port (5555) ภายนอก (มีความเสี่ยง!)

### 3. Network
```bash
# UFW (Linux)
sudo ufw allow 3000/tcp
sudo ufw deny 5555/tcp  # ADB port
sudo ufw enable
```

### 4. Environment Variables
ไม่ควร hardcode secret ใน .env
ใช้ `process.env.KEY_NAME` ฝั่ง server
ไม่เปิด .env ให้ client (browser)

## ============= MULTI-DEVICE SETUP =============

### ต่อ USB หลายเครื่อง
```bash
# ต่อ USB 3 เครื่อง
adb devices
# R5CR80XXXXX device
# R5CR90XXXXX device  
# R5CRA0XXXXX device

# ควบคุมแต่ละเครื่องในเวป (เลือกจาก dropdown)
# แต่ละเครื่องมี deviceId แยก → database แยกแถว
```

### ต่อ WiFi หลายเครื่อง
```bash
# เครื่อง 1 (USB ครั้งเดียว → tcpip)
adb tcpip 5555
# ถอดสาย → ต่อ WiFi
adb connect 192.168.1.101:5555

# เครื่อง 2
adb connect 192.168.1.102:5555

# เครื่อง 3 (APK Agent)
# ติดตั้ง ro_agent.py บนมือถือ → ส่งข้อมูลเอง
# ไม่ต้องใช้ ADB เลย
```

## ============= MONITORING =============

### Log Locations
```bash
# Server log
/var/log/ro-server.log  (systemd)
# หรือ:
nohup npm run start > /tmp/ro-server.log 2>&1 &

# ADB Monitor log
/tmp/ro-monitor.log

# APK Agent log (บนมือถือ)
/tmp/ro_agent.log
```

### Health Check
```bash
curl http://localhost:3000/api/health
# ได้: {"ok":true}
```

## ============= TROUBLESHOOTING =============

| ปัญหา | สาเหตุ | แก้ไข |
|--------|--------|-------|
| `adb devices` ไม่เจอเครื่อง | USB driver / USB Debugging | เปิด Developer Options → USB Debugging ON |
| `unauthorized` | ไม่ได้กด ALLOW | บนมือถือยืนยัน + `adb kill-server` → `start-server` |
| `offline` | WiFi หยุด / IP เปลี่ยน | `adb disconnect` → `connect` ใหม่ |
| Server ไม่เริ่ม | Port ใช้งาน / DB ไม่เชื่อม | `lsof -i :3000` / ตรวจ `.env` |
| Screenshot ไม่อัปเดต | ADB ไม่ตอบ / permission | `adb shell ls /sdcard/` / `chmod` |
| Bot ไม่ตอบสนอง | Screen position ผิด | Calibrate ใน Dashboard (ปรับ x,y) |

## ============= UPDATE =============

```bash
# ดึงเวอร์ชันใหม่
git pull origin main
npm install
npm run build

# อัปเดต schema
npx drizzle-kit push

# รีสตาร์ท
pm2 restart ro-bot
# หรือ
systemctl restart ro-server
```

## ============= SUPPORT =============

- ADB Documentation: https://developer.android.com/studio/command-line/adb
- Drizzle ORM: https://orm.drizzle.team/
- Next.js: https://nextjs.org/
- Project: RO Bot - Multi-Device ADB Control for Ragnarok: The New World
