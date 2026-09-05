import { NextResponse } from "next/server";
import { db } from "@/db";
import { gameState } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device") || "";

  try {
    if (deviceId) {
      const state = await db.select().from(gameState).where(eq(gameState.deviceId, deviceId)).orderBy(desc(gameState.updatedAt)).limit(1);
      return NextResponse.json(state[0] || null);
    }
    const all = await db.select().from(gameState).orderBy(desc(gameState.updatedAt)).limit(10);
    return NextResponse.json(all);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { deviceId, ...rest } = data;
    if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

    const existing = await db.select().from(gameState).where(eq(gameState.deviceId, deviceId)).limit(1);
    if (existing.length > 0) {
      await db.update(gameState).set({ ...rest, updatedAt: new Date() }).where(eq(gameState.deviceId, deviceId));
      return NextResponse.json({ ...existing[0], ...rest });
    }
    const result = await db.insert(gameState).values({ deviceId, ...rest }).returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
