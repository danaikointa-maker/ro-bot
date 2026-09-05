import { NextResponse } from "next/server";
import { db } from "@/db";
import { adbCommands } from "@/db/schema";

// Queue a command for a device (used by web dashboard to send commands to APK agent)
export async function POST(req: Request) {
  try {
    const { deviceId, command, action, params } = await req.json();

    if (!deviceId || !command) {
      return NextResponse.json({ error: "deviceId and command required" }, { status: 400 });
    }

    const result = await db.insert(adbCommands).values({
      deviceId,
      command: action ? `${action}:${JSON.stringify(params || {})}` : command,
      status: "pending",
    }).returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
