import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { RO_PACKAGE } from "@/lib/ro-bot";

const PKG = RO_PACKAGE;

function adb(deviceId: string, cmd: string): string {
  try {
    return execSync(`adb -s ${deviceId} ${cmd}`, { timeout: 15000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    return `ERR: ${(e.stderr || e.message || "Failed").toString().slice(0, 500)}`;
  }
}

export async function POST(req: Request) {
  const { deviceId, action, params } = await req.json();
  const id = deviceId || "";

  switch (action) {
    case "launch": {
      const out = adb(id, `shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
      return NextResponse.json({ action, output: out });
    }
    case "stop": {
      const out = adb(id, `shell am force-stop ${PKG}`);
      return NextResponse.json({ action, output: out });
    }
    case "is_running": {
      const out = adb(id, `shell pidof ${PKG}`);
      return NextResponse.json({ action, running: !out.includes("ERR") && out.length > 0, output: out });
    }
    case "screenshot": {
      const screenPath = "/sdcard/ro_bot_screen.png";
      adb(id, `shell screencap -p ${screenPath}`);
      const out = adb(id, `pull ${screenPath} /tmp/ro_screen.png`);
      return NextResponse.json({ action, output: `Screenshot captured\n${out}` });
    }
    case "tap": {
      const x = params?.x ?? 540, y = params?.y ?? 960;
      return NextResponse.json({ action, output: adb(id, `shell input tap ${x} ${y}`) });
    }
    case "swipe": {
      const { x1, y1, x2, y2, duration = 300 } = params || {};
      return NextResponse.json({ action, output: adb(id, `shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`) });
    }
    case "keyevent": {
      return NextResponse.json({ action, output: adb(id, `shell input keyevent ${params?.keycode || 66}`) });
    }
    case "text": {
      return NextResponse.json({ action, output: adb(id, `shell input text "${params?.text || ""}"`) });
    }
    case "screen_size": {
      return NextResponse.json({ action, output: adb(id, "shell wm size") });
    }
    case "battery": {
      return NextResponse.json({ action, output: adb(id, "shell dumpsys battery") });
    }
    case "memory": {
      return NextResponse.json({ action, output: adb(id, `shell dumpsys meminfo ${PKG}`) });
    }
    case "logcat": {
      const lines = params?.lines || 50;
      return NextResponse.json({ action, output: adb(id, `shell logcat -d -t ${lines} ${PKG}`) });
    }
    case "read_pixels": {
      // Read pixel colors at specific positions for HP/SP detection
      const { x = 100, y = 50 } = params || {};
      const out = adb(id, `shell screencap -p /sdcard/px.png && shell convert /sdcard/px.png -crop 1x1+${x}+${y} txt:-`);
      return NextResponse.json({ action, output: out });
    }
    case "forward": {
      const local = params?.local || 3000, remote = params?.remote || 3000;
      return NextResponse.json({ action, output: adb(id, `forward tcp:${local} tcp:${remote}`) });
    }
    case "connect_adb": {
      const { ip, port = 5555 } = params || {};
      if (!ip) return NextResponse.json({ error: "ip required" }, { status: 400 });
      try {
        const out = execSync(`adb connect ${ip}:${port}`, { timeout: 10000, encoding: "utf-8" }).trim();
        return NextResponse.json({ action, output: out });
      } catch (err: unknown) {
        return NextResponse.json({ action, output: `ERR: ${String(err)}` });
      }
    }
    case "pair_adb": {
      const { ip, port, code } = params || {};
      if (!ip || !port || !code) return NextResponse.json({ error: "ip, port, code required" }, { status: 400 });
      try {
        const out = execSync(`adb pair ${ip}:${port} ${code}`, { timeout: 10000, encoding: "utf-8" }).trim();
        return NextResponse.json({ action, output: out });
      } catch (err: unknown) {
        return NextResponse.json({ action, output: `ERR: ${String(err)}` });
      }
    }
    case "tcpip": {
      const port = params?.port || 5555;
      try {
        const out = execSync(`adb tcpip ${port}`, { timeout: 10000, encoding: "utf-8" }).trim();
        return NextResponse.json({ action, output: out });
      } catch (err: unknown) {
        return NextResponse.json({ action, output: `ERR: ${String(err)}` });
      }
    }
    case "list_devices": {
      try {
        const out = execSync("adb devices -l", { timeout: 5000, encoding: "utf-8" }).trim();
        return NextResponse.json({ action, output: out });
      } catch (err: unknown) {
        return NextResponse.json({ action, output: `ERR: ${String(err)}` });
      }
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
