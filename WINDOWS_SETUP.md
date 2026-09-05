# RO Bot Multi-Device Windows Setup
# สำหรับ Windows 10/11 ที่ต้องการควบคุม Android ผ่าน ADB

## ขั้นตอน 1: ติดตั้ง ADB บน Windows

### วิธี A: ผ่าน Android SDK Platform Tools (แนะนำ)
1. ดาวน์โหลดจาก https://developer.android.com/studio/releases/platform-tools
2. แตกไฟล์ → วางที่ `C:\platform-tools`
3. เพิ่ม `C:\platform-tools` เข้าสู่ PATH

### วิธี B: ผ่าน Chocolatey (ถ้ามี)
```cmd
choco install android-sdk
```

### วิธี C: ผ่าน SDK Manager
```cmd
sdkmanager "platform-tools"
```

ตรวจสอบ:
```cmd
adb version
```

## ขั้นตอน 2: เปิด USB Debugging บน Android
1. Settings → About Phone → กด Build Number 7 ครั้ง
2. Settings → Developer Options → USB Debugging = ON
3. เสียบ USB → บนมือถือกด ALLOW

## ขั้นตอน 3: เชื่อมต่อ

### USB (โดยตรง)
```cmd
adb devices
```

### WiFi (ไม่ต้องใช้สายตลอดเวลา)
```cmd
d:  // ต่อ USB ครั้งเดียว
adb tcpip 5555
adb shell ip route
crypt | findstr "inet "
// ได้ IP เช่น 192.168.1.100
// ถอดสาย USB
adb connect 192.168.1.100:5555
adb devices
```

## ขั้นตอน 4: รัน RO Bot Server + Client

### เปิด Server (ใน Terminal/PowerShell):
```cmd
npm run build
npm run start
```

### รัน Client (เปิด Browser อัตโนมัติ):
```cmd
ro_client.bat [DEVICE_ID] [PORT]

ตัวอย่าง:
ro_client.bat R5CR80XXXXX 3000
```

### หรือเปิด Browser เอง:
```
http://localhost:3000
```

## ขั้นตอน 5: ควบคุมเกม
- ไปที่แท็บ **📱 ADB** → กด **SCN** เพื่อดูเครื่อง
- เลือกเครื่องจาก dropdown
- ไปแท็บ **🎮 GAME CTRL** → คลิกที่หน้าจอเพื่อส่ง Tap
- ไปแท็บ **🤖 BOT** → เปิด Auto Attack / Farm / Buff

## การเชื่อมต่อหลายเครื่องบน Windows

### เครื่อง 1 (USB)
```cmd
adb devices
# ได้ R5CR80XXXXX  device
```

### เครื่อง 2 (WiFi)
```cmd
adb connect 192.168.1.101:5555
adb connect 192.168.1.102:5555
adb devices
# ได้:
# R5CR80XXXXX  device
# 192.168.1.101:5555  device
# 192.168.1.102:5555  device
```

### ควบคุมแต่ละเครื่องผ่านเวป
- เลือก device จาก dropdown → ส่งคำสั่งแยกต่อเครื่อง
- แต่ละเครื่องมี screen size แยก → ต้อง calibrate ตำแหน่งปุ่ม
