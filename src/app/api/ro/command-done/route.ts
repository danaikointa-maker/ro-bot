import { NextResponse } from "next/server";
import { db } from "@/db";
import { adbCommands } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { commandId, deviceId, status, output } = await req.json();

    if (commandId) {
      await db.update(adbCommands)
        .set({
          status: status || "completed",
          output: output || "",
          completedAt: new Date(),
        })
        .where(eq(adbCommands.id, +commandId));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
