import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device") || "";

  try {
    const screenPath = "/tmp/ro_screen.png";

    if (deviceId) {
      try {
        execSync(`adb -s ${deviceId} shell screencap -p /sdcard/ro_screen.png`, { timeout: 10000 });
        execSync(`adb -s ${deviceId} pull /sdcard/ro_screen.png ${screenPath}`, { timeout: 10000 });
      } catch {}
    }

    if (existsSync(screenPath)) {
      const buf = readFileSync(screenPath);
      return new Response(buf, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store",
          "Content-Length": buf.length.toString(),
        },
      });
    }

    const empty = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    return new Response(empty, { headers: { "Content-Type": "image/png" } });
  } catch {
    return NextResponse.json({ error: "Screenshot failed" }, { status: 500 });
  }
}
