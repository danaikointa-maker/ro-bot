"use client";

import React, { useState, useEffect, useCallback } from "react";

interface DeviceInfo {
  id: string;
  label: string;
  status: string;
  connectionType: string;
  model: string;
  screenW: number;
  screenH: number;
  gameRunning: boolean;
  batteryLevel: string;
  mapName: string;
  hp: number;
  maxHp: number;
}

export default function MultiDevicePanel({
  selected,
  onSelect,
  onConnect,
  onScan,
}: {
  selected: string;
  onSelect: (id: string) => void;
  onConnect: (id: string) => void;
  onScan: () => void;
}) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [connIp, setConnIp] = useState("");
  const [connPort, setConnPort] = useState("5555");
  const [showConnect, setShowConnect] = useState(false);

  // Poll devices from server
  const refreshDevices = useCallback(async () => {
    try {
      // Get from ADB discover
      const adbRes = await fetch("/api/ro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_devices" }),
      });
      const adbData = await adbRes.json();

      const parsed: DeviceInfo[] = [];
      if (adbData?.output) {
        const lines = adbData.output.split("\n").filter((l: string) => l.includes("\tdevice") || l.includes("\toffline"));
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const id = parts[0];
          const status = parts[1] === "device" ? "connected" : parts[1];
          const model = parts.find((p: string) => p.startsWith("model:"))?.split(":")[1] || "";
          parsed.push({
            id, label: model ? `${model} (${id.slice(0, 15)})` : id,
            status, connectionType: "adb", model,
            screenW: 1080, screenH: 2400,
            gameRunning: false, batteryLevel: "",
            mapName: "", hp: 0, maxHp: 0,
          });
        }
      }

      // Also get from database (APK agents)
      try {
        const dbRes = await fetch("/api/devices");
        const dbData = await dbRes.json();
        for (const d of dbData) {
          if (!parsed.find((p) => p.id === d.deviceId)) {
            parsed.push({
              id: d.deviceId,
              label: d.name || d.deviceId,
              status: d.status || "unknown",
              connectionType: d.connectionType || "unknown",
              model: d.model || "",
              screenW: d.screenW || 1080,
              screenH: d.screenH || 2400,
              gameRunning: false, batteryLevel: "",
              mapName: "", hp: 0, maxHp: 0,
            });
          }
        }
      } catch {}

      // Get game state for each device
      for (const dev of parsed) {
        try {
          const stateRes = await fetch(`/api/ro/state?device=${encodeURIComponent(dev.id)}`);
          const state = await stateRes.json();
          if (state) {
            dev.hp = state.hp || 0;
            dev.maxHp = state.maxHp || 0;
            dev.mapName = state.mapName || "";
            dev.gameRunning = !!state.isAlive;
          }
        } catch {}
      }

      setDevices(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    refreshDevices();
    const iv = setInterval(refreshDevices, 8000);
    return () => clearInterval(iv);
  }, [refreshDevices]);

  const addWifiDevice = async () => {
    if (!connIp) return;
    try {
      const res = await fetch("/api/ro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect_adb", params: { ip: connIp, port: +connPort } }),
      });
      const data = await res.json();
      setTimeout(refreshDevices, 2000);
      return data;
    } catch {}
  };

  return (
    <div className="border border-slate-800 rounded bg-slate-950/80">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        <span className="text-[11px] font-mono font-bold text-cyan-400">📱 DEVICES</span>
        <span className="text-[9px] font-mono text-slate-500">{devices.length} connected</span>
        <div className="flex-1" />
        <button onClick={() => { onScan(); refreshDevices(); }} className="px-2 py-0.5 text-[9px] font-mono border border-cyan-800 text-cyan-400 hover:bg-cyan-900/30 rounded">
          ↻ SCAN
        </button>
        <button onClick={() => setShowConnect(!showConnect)} className="px-2 py-0.5 text-[9px] font-mono border border-slate-700 text-slate-400 hover:text-white rounded">
          + ADD
        </button>
      </div>

      {/* Add device form */}
      {showConnect && (
        <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/50 space-y-2">
          <p className="text-[9px] font-mono text-yellow-400 font-bold">Connect New Device</p>
          
          {/* WiFi */}
          <div className="flex gap-1 items-center">
            <span className="text-[9px] font-mono text-slate-500 w-16">WiFi:</span>
            <input value={connIp} onChange={(e) => setConnIp(e.target.value)} placeholder="192.168.1.x"
              className="flex-1 bg-slate-800 border border-slate-700 text-[10px] font-mono text-green-400 px-1 py-0.5 rounded placeholder:text-slate-600" />
            <span className="text-slate-600 text-[10px]">:</span>
            <input value={connPort} onChange={(e) => setConnPort(e.target.value)}
              className="w-12 bg-slate-800 border border-slate-700 text-[10px] font-mono text-green-400 px-1 py-0.5 rounded" />
            <button onClick={addWifiDevice} className="px-2 py-0.5 text-[9px] font-mono bg-green-900/40 border border-green-700 text-green-400 rounded">
              CONNECT
            </button>
          </div>

          {/* APK Agent instructions */}
          <div className="border border-slate-700/50 rounded p-1.5 bg-slate-800/50">
            <p className="text-[8px] font-mono text-purple-400 font-bold mb-0.5">APK Agent (ไม่ต้องใช้ ADB):</p>
            <p className="text-[8px] font-mono text-slate-500">
              1. ติดตั้ง Termux → <code className="text-green-400">pip3 install requests</code><br/>
              2. <code className="text-green-400">RO_SERVER=http://SERVER_IP:3000 python3 ro_agent.py</code><br/>
              3. Agent จะส่งข้อมูลมาอัตโนมัติทุก 5 วินาที
            </p>
          </div>
        </div>
      )}

      {/* Device list */}
      <div className="max-h-48 overflow-auto">
        {devices.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-[10px] font-mono text-slate-500 mb-1">No devices connected</p>
            <p className="text-[8px] font-mono text-slate-600">
              USB: เสียบสาย + adb devices | WiFi: กด + ADD | APK: รัน ro_agent.py
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {devices.map((dev) => (
              <div
                key={dev.id}
                onClick={() => { onSelect(dev.id); onConnect(dev.id); }}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  selected === dev.id ? "bg-cyan-950/30" : "hover:bg-slate-900/50"
                }`}
              >
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  dev.status === "connected" ? "bg-green-400" : dev.status === "offline" ? "bg-red-400" : "bg-yellow-400 animate-pulse"
                }`} />

                {/* Device info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-slate-200 truncate">{dev.label}</p>
                  <div className="flex items-center gap-2 text-[8px] font-mono text-slate-500">
                    <span>{dev.id.slice(0, 20)}</span>
                    <span className={`px-1 rounded ${
                      dev.connectionType === "adb" ? "bg-blue-900/40 text-blue-400" :
                      dev.connectionType === "apk" ? "bg-purple-900/40 text-purple-400" :
                      "bg-slate-800 text-slate-500"
                    }`}>{dev.connectionType.toUpperCase()}</span>
                    {dev.gameRunning && <span className="text-green-400">🎮</span>}
                    {dev.mapName && <span className="text-cyan-400">{dev.mapName}</span>}
                  </div>
                </div>

                {/* HP bar mini */}
                {dev.maxHp > 0 && (
                  <div className="w-12 h-1.5 bg-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${(dev.hp / dev.maxHp) * 100}%` }} />
                  </div>
                )}

                {/* Selected indicator */}
                {selected === dev.id && (
                  <span className="text-cyan-400 text-[10px]">◀</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
