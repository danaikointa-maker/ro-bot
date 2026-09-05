import { NextResponse } from "next/server";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allDevices = await db.select().from(devices).orderBy(desc(devices.lastSeen));
    return NextResponse.json(allDevices);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId, name, model, connectionType, screenW, screenH } = body;
    if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

    const result = await db.insert(devices).values({
      deviceId,
      name: name || deviceId,
      model: model || "",
      connectionType: connectionType || "adb",
      screenW: screenW || 1080,
      screenH: screenH || 2400,
      status: "connected",
      connectedAt: new Date(),
    }).returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
