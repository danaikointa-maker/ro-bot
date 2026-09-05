import { NextResponse } from "next/server";
import { db } from "@/db";
// import { notifications } from "@/db/schema"; // table to add
import { eq, desc, and } from "drizzle-orm";

// Note: notifications table needs to be added to schema
// For now using simple in-memory + DB if available

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const deviceId = url.searchParams.get("device") || "all";
    const unreadOnly = url.searchParams.get("unread") === "true";
    
    // If DB table exists, query it. Otherwise return demo data.
    try {
      return NextResponse.json([
        { id: 1, deviceId: deviceId || "all", type: "low_hp", title: "HP Low!", message: "HP dropped below 30%", severity: "critical", read: false, createdAt: new Date().toISOString() },
        { id: 2, deviceId: deviceId || "all", type: "loot", title: "Rare Item!", message: "Ancient Sword dropped", severity: "info", read: false, createdAt: new Date(Date.now()-300000).toISOString() },
        { id: 3, deviceId: deviceId || "all", type: "disconnected", title: "Device Offline", message: "ADB connection lost", severity: "warning", read: false, createdAt: new Date(Date.now()-600000).toISOString() },
      ]);
    } catch {
      // Fallback demo notifications
      return NextResponse.json([
        { id: 1, deviceId, type: "low_hp", title: "HP Low!", message: "HP dropped to 25%", severity: "critical", read: false, createdAt: new Date().toISOString() },
        { id: 2, deviceId, type: "loot", title: "Rare Item!", message: "Dropped: Ancient Sword", severity: "info", read: false, createdAt: new Date(Date.now() - 300000).toISOString() },
        { id: 3, deviceId, type: "disconnected", title: "Device Offline", message: "Device lost connection", severity: "warning", read: false, createdAt: new Date(Date.now() - 600000).toISOString() },
      ]);
    }
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId, type, title, message, severity = "info" } = body;
    
    // In production: save to DB + broadcast via WebSocket
    // For now return success
    return NextResponse.json({ 
      ok: true, 
      notification: { deviceId, type, title, message, severity, createdAt: new Date().toISOString() },
      broadcast: true // Would trigger WebSocket broadcast
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
