import { WebSocketServer } from "ws";
import { NextRequest } from "next/server";
import { createServer } from "node:http";
import { parse } from "url";

// WebSocket server for real-time updates
export const dynamic = "force-dynamic";

let wss: WebSocketServer | null = null;
const clients = new Set<any>();

export function initWebSocket(httpServer: any) {
  if (wss) return wss;
  
  wss = new WebSocketServer({ 
    server: httpServer, 
    path: "/ws",
    perMessageDeflate: true,
  });
  
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({
      type: "connected",
      deviceId: "broadcast",
      data: { message: "Connected to RO Bot Real-time", timestamp: new Date().toISOString() },
    }));
    
    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.subscribe) {
          ws.send(JSON.stringify({
            type: "subscribed",
            deviceId: data.subscribe,
          }));
        }
        // Broadcast to all clients
        clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: "broadcast",
              ...data,
              timestamp: new Date().toISOString(),
            }));
          }
        });
      } catch {}
    });
    
    ws.on("close", () => clients.delete(ws));
  });
  
  return wss;
}

export function broadcastToAll(msg: any) {
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({
        ...msg,
        timestamp: new Date().toISOString(),
      }));
    }
  });
}
