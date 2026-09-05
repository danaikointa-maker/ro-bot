import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { db } from "@/db";
import { adbCommands, devices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function adbExec(deviceId: string, cmd: string, timeout = 10000): { output: string; error?: string } {
  try {
    // Windows compatibility: use cmd /c for Windows env
    const isWindows = process.platform === "win32";
    let fullCmd: string;
    if (cmd === "devices" || cmd === "adb devices") {
      fullCmd = isWindows ? "cmd /c adb devices -l" : "adb devices -l";
    } else if (cmd.startsWith("adb ")) {
      fullCmd = isWindows ? `cmd /c ${cmd.replace("adb ", `adb -s ${deviceId} `)}` : cmd.replace("adb ", `adb -s ${deviceId} `);
    } else {
      fullCmd = isWindows ? `cmd /c adb -s ${deviceId} ${cmd}` : `adb -s ${deviceId} ${cmd}`;
    }
    const output = execSync(fullCmd, { timeout, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return { output: output.trimEnd() };
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    return { output: (e.stderr || e.message || "Failed").toString().slice(0, 2000), error: "exec_error" };
  }
}

export async function GET() {
  try {
    const recent = await db.select().from(adbCommands).orderBy(desc(adbCommands.createdAt)).limit(50);
    return NextResponse.json(recent);
  } catch { return NextResponse.json([]); }
}

export async function POST(req: Request) {
  try {
    const { deviceId, command } = await req.json();
    if (!deviceId || !command) return NextResponse.json({ error: "deviceId and command required" }, { status: 400 });

    const [cmdRecord] = await db.insert(adbCommands).values({ deviceId, command, status: "running" }).returning();
    const result = adbExec(deviceId, command);
    const status = result.error ? "error" : "completed";

    await db.update(adbCommands).set({ output: result.output, status, completedAt: new Date() }).where(eq(adbCommands.id, cmdRecord.id));
    try { await db.update(devices).set({ lastSeen: new Date() }).where(eq(devices.deviceId, deviceId)); } catch {}

    return NextResponse.json({ ...cmdRecord, output: result.output, status });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export { adbExec };
