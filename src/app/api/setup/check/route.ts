import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { existsSync } from "fs";

interface ToolStatus {
  name: string;
  key: string;
  installed: boolean;
  version: string;
  path: string;
  required: boolean;
  category: "core" | "database" | "tool" | "optional";
  downloadUrl: string;
  installCmd: string;
  description: string;
}

function checkTool(cmd: string, args: string = "--version", timeout = 5000): { ok: boolean; ver: string; path: string } {
  try {
    const out = execSync(`${cmd} ${args}`, { timeout, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    const path = execSync(`which ${cmd} 2>/dev/null || where ${cmd} 2>/dev/null`, { timeout: 3000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim().split("\n")[0];
    return { ok: true, ver: out.split("\n")[0].slice(0, 60), path };
  } catch {
    return { ok: false, ver: "", path: "" };
  }
}

function checkDb(type: "postgresql" | "mysql"): { ok: boolean; ver: string; dbExists: boolean } {
  const cmd = type === "postgresql" ? "psql" : "mysql";
  const { ok, ver } = checkTool(cmd);
  let dbExists = false;
  if (ok) {
    try {
      if (type === "postgresql") {
        const out = execSync('psql -U postgres -lqt 2>/dev/null | grep app_db || echo ""', { timeout: 5000, encoding: "utf-8" }).trim();
        dbExists = out.includes("app_db");
      } else {
        const out = execSync('mysql -u root -e "SHOW DATABASES LIKE \'app_db\';" 2>/dev/null || echo ""', { timeout: 5000, encoding: "utf-8" }).trim();
        dbExists = out.includes("app_db");
      }
    } catch {}
  }
  return { ok, ver, dbExists };
}

export async function GET() {
  const tools: ToolStatus[] = [];
  const isWin = process.platform === "win32";

  // Core
  const node = checkTool("node");
  tools.push({
    name: "Node.js", key: "node", installed: node.ok, version: node.ver, path: node.path,
    required: true, category: "core",
    downloadUrl: "https://nodejs.org/", installCmd: isWin ? "winget install OpenJS.NodeJS.LTS" : "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs",
    description: "JavaScript runtime (v18+ required)",
  });

  const npm = checkTool("npm");
  tools.push({
    name: "npm", key: "npm", installed: npm.ok, version: npm.ver, path: npm.path,
    required: true, category: "core",
    downloadUrl: "", installCmd: "Comes with Node.js",
    description: "Package manager",
  });

  // Database
  const pg = checkDb("postgresql");
  tools.push({
    name: "PostgreSQL", key: "postgresql", installed: pg.ok, version: pg.ver, path: "",
    required: false, category: "database",
    downloadUrl: isWin ? "https://www.postgresql.org/download/windows/" : "https://www.postgresql.org/download/",
    installCmd: isWin ? "winget install PostgreSQL.PostgreSQL" : "sudo apt install postgresql postgresql-contrib",
    description: pg.dbExists ? "✅ app_db exists" : pg.ok ? "Installed (app_db not created yet)" : "Not installed",
  });

  const my = checkDb("mysql");
  tools.push({
    name: "MySQL", key: "mysql", installed: my.ok, version: my.ver, path: "",
    required: false, category: "database",
    downloadUrl: isWin ? "https://dev.mysql.com/downloads/installer/" : "https://dev.mysql.com/downloads/",
    installCmd: isWin ? "winget install Oracle.MySQL" : "sudo apt install mysql-server",
    description: my.dbExists ? "✅ app_db exists" : my.ok ? "Installed (app_db not created yet)" : "Not installed",
  });

  // Tools
  const adb = checkTool("adb", "version");
  tools.push({
    name: "ADB", key: "adb", installed: adb.ok, version: adb.ver, path: adb.path,
    required: false, category: "tool",
    downloadUrl: "https://developer.android.com/studio/releases/platform-tools",
    installCmd: isWin ? "Extract to C:\\platform-tools, add to PATH" : "sudo apt install android-tools-adb",
    description: "Android Debug Bridge for device control",
  });

  const py3 = checkTool("python3");
  const py = checkTool("python");
  const pyOk = py3.ok || py.ok;
  tools.push({
    name: "Python3", key: "python3", installed: pyOk, version: py3.ver || py.ver, path: py3.path || py.path,
    required: false, category: "tool",
    downloadUrl: isWin ? "https://www.python.org/downloads/" : "",
    installCmd: isWin ? "winget install Python.Python.3.12" : "sudo apt install python3 python3-pip",
    description: "For ro_monitor.py / ro_agent.py / background service",
  });

  const tesseract = checkTool("tesseract");
  tools.push({
    name: "Tesseract OCR", key: "tesseract", installed: tesseract.ok, version: tesseract.ver, path: tesseract.path,
    required: false, category: "optional",
    downloadUrl: "https://github.com/tesseract-ocr/tesseract",
    installCmd: isWin ? "Download from GitHub releases" : "sudo apt install tesseract-ocr",
    description: "OCR for reading game screen (HP/SP/Map)",
  });

  const git = checkTool("git");
  tools.push({
    name: "Git", key: "git", installed: git.ok, version: git.ver, path: git.path,
    required: false, category: "optional",
    downloadUrl: "https://git-scm.com/",
    installCmd: isWin ? "winget install Git.Git" : "sudo apt install git",
    description: "For updates and version control",
  });

  // Check Python libraries
  let pyLibs = { requests: false, pytesseract: false, pillow: false };
  if (pyOk) {
    const pyCmd = py3.ok ? "python3" : "python";
    try { execSync(`${pyCmd} -c "import requests"`, { timeout: 3000 }); pyLibs.requests = true; } catch {}
    try { execSync(`${pyCmd} -c "import pytesseract"`, { timeout: 3000 }); pyLibs.pytesseract = true; } catch {}
    try { execSync(`${pyCmd} -c "from PIL import Image"`, { timeout: 3000 }); pyLibs.pillow = true; } catch {}
  }

  // Check if ro_service.py is running
  let pyServiceRunning = false;
  try {
    const out = execSync("pgrep -f ro_service.py || echo ''", { timeout: 3000, encoding: "utf-8" }).trim();
    pyServiceRunning = out.length > 0 && !out.includes("pgrep");
  } catch {}

  // Check if server DB tables exist
  let dbTablesReady = false;
  try {
    const { db } = await import("@/db");
    const { devices } = await import("@/db/schema");
    await db.select().from(devices).limit(1);
    dbTablesReady = true;
  } catch {}

  return NextResponse.json({
    tools,
    pyLibs,
    pyServiceRunning,
    dbTablesReady,
    platform: process.platform,
    arch: process.arch,
    hostname: require("os").hostname(),
    cpus: require("os").cpus().length,
    totalMemMB: Math.round(require("os").totalmem() / 1024 / 1024),
  });
}
