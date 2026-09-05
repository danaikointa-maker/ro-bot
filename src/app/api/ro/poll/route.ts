import { NextResponse } from "next/server";
import { db } from "@/db";
import { adbCommands } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device") || "";

  try {
    // Get pending commands for this device
    const pending = await db
      .select()
      .from(adbCommands)
      .where(
        and(
          eq(adbCommands.deviceId, deviceId),
          eq(adbCommands.status, "pending")
        )
      )
      .orderBy(desc(adbCommands.createdAt))
      .limit(10);

    return NextResponse.json(pending);
  } catch {
    return NextResponse.json([]);
  }
}
