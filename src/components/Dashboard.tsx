"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { BotConfig, DEFAULT_BOT_CONFIG, RoGameState, Waypoint, ChatMessage, PartyMember, RO_JOBS, RO_PACKAGE } from "@/lib/ro-bot";
import LoginPin from "./LoginPin";
import ProfileManager from "./ProfileManager";
import ScheduleTimer from "./ScheduleTimer";
import AntiDetectPanel from "./AntiDetectPanel";
import SafetyPanel from "./SafetyPanel";
import AutoLoginPanel from "./AutoLoginPanel";
import StatisticsPanel from "./StatisticsPanel";

const PKG = RO_PACKAGE;

export default function Dashboard() {
  // Connection
  const [deviceId, setDeviceId] = useState("");
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState<{ id: string; label: string }[]>([]);
  const [showMultiDevice, setShowMultiDevice] = useState(true);
  const [connIp, setConnIp] = useState("");
  const [connPort, setConnPort] = useState("5555");
  const [pairIp, setPairIp] = useState("");
  const [pairPort, setPairPort] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [screenW, setScreenW] = useState(1080);
  const [screenH, setScreenH] = useState(2400);

  // Game state
  const [gs, setGs] = useState<RoGameState>({
    hp: 0, maxHp: 0, sp: 0, maxSp: 0, baseLevel: 0, jobLevel: 0,
    zeny: 0, posX: 0, posY: 0, mapName: "", jobName: "", guildName: "",
    partyName: "", isAlive: false, inCombat: false, targetName: "",
    targetHp: 0, targetMaxHp: 0,
  });

  // Bot config
  const [bot, setBot] = useState<BotConfig>(DEFAULT_BOT_CONFIG);
  const [gameRunning, setGameRunning] = useState(false);

  // Screen mirror
  const [screenUrl, setScreenUrl] = useState("");
  const [screenRefresh, setScreenRefresh] = useState(0);
  const [autoScreen, setAutoScreen] = useState(false);

  // Waypoints
  const [wps, setWps] = useState<Waypoint[]>([]);
  const [newWpLabel, setNewWpLabel] = useState("");
  const [newWpX, setNewWpX] = useState(0);
  const [newWpY, setNewWpY] = useState(0);

  // Chat
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Party
  const [party, setParty] = useState<PartyMember[]>([]);

  // Log
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLog((prev) => [...prev.slice(-200), `[${time}] ${msg}`]);
  };

  // Tab
  const [tab, setTab] = useState<"connect" | "dashboard" | "bot" | "macro" | "system">("connect");

  // Bot intervals
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);

  const clearBotIntervals = () => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  };

  // API helpers
  const roAction = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    try {
      const res = await fetch("/api/ro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, action, params }),
      });
      const data = await res.json();
      addLog(`${action}: ${data.output?.slice(0, 100) || data.error || "ok"}`);
      return data;
    } catch (err) {
      addLog(`ERR ${action}: ${err}`);
      return null;
    }
  }, [deviceId]);

  const adbCmd = useCallback(async (cmd: string) => {
    try {
      const res = await fetch("/api/adb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, command: cmd }),
      });
      const data = await res.json();
      addLog(`adb ${cmd}: ${data.output?.slice(0, 80) || "ok"}`);
      return data;
    } catch (err) {
      addLog(`ERR: ${err}`);
      return null;
    }
  }, [deviceId]);

  // Refresh screenshot
  const refreshScreen = useCallback(async () => {
    if (!deviceId) return;
    await roAction("screenshot");
    setScreenRefresh((r) => r + 1);
    setScreenUrl(`/api/ro/screen?device=${encodeURIComponent(deviceId)}&t=${Date.now()}`);
  }, [deviceId, roAction]);

  // Auto screen refresh
  useEffect(() => {
    if (autoScreen && deviceId) {
      const iv = setInterval(refreshScreen, 2000);
      return () => clearInterval(iv);
    }
  }, [autoScreen, deviceId, refreshScreen]);

  // Scan devices
  const scanDevices = useCallback(async () => {
    const data = await roAction("list_devices");
    if (data?.output) {
      const lines = data.output.split("\n").filter((l: string) => l.includes("\t"));
      const devs = lines.map((l: string) => {
        const [id, status] = l.trim().split(/\s+/);
        return { id, label: `${id} (${status})` };
      });
      setDevices(devs);
      if (devs.length > 0 && !deviceId) setDeviceId(devs[0].id);
    }
  }, [roAction, deviceId]);

  // Check game status
  const checkGame = useCallback(async () => {
    const data = await roAction("is_running");
    setGameRunning(!!data?.running);
  }, [roAction]);

  // Start bot loops
  const startBot = useCallback(() => {
    clearBotIntervals();
    addLog("BOT STARTED");

    // Auto-pot loop
    if (bot.autoPot) {
      const iv = setInterval(async () => {
        if (gs.maxHp > 0) {
          const hpPct = (gs.hp / gs.maxHp) * 100;
          if (hpPct < bot.hpEmergencyThreshold) {
            await roAction("tap", { x: bot.emergencyPotBtn.x, y: bot.emergencyPotBtn.y });
          } else if (hpPct < bot.hpPotThreshold) {
            await roAction("tap", { x: bot.potBtn.x, y: bot.potBtn.y });
          }
        }
        if (gs.maxSp > 0 && (gs.sp / gs.maxSp) * 100 < bot.spPotThreshold) {
          await roAction("tap", { x: bot.potBtn.x, y: bot.potBtn.y });
        }
      }, bot.potCheckInterval);
      intervalsRef.current.push(iv);
    }

    // Auto-attack loop
    if (bot.autoAttack) {
      const iv = setInterval(async () => {
        if (bot.autoSkill && bot.attackSkill > 0) {
          const slot = bot.skillSlots[bot.attackSkill - 1];
          if (slot) await roAction("tap", { x: slot.x, y: slot.y });
        }
        await roAction("tap", { x: bot.attackBtn.x, y: bot.attackBtn.y });
        if (bot.autoLoot) {
          await roAction("tap", { x: bot.lootBtn.x, y: bot.lootBtn.y });
        }
      }, bot.attackInterval);
      intervalsRef.current.push(iv);
    }

    // Auto-buff loop (every 60s)
    if (bot.autoBuff && bot.buffSkills.length > 0) {
      const iv = setInterval(async () => {
        for (const idx of bot.buffSkills) {
          const slot = bot.skillSlots[idx - 1];
          if (slot) {
            await roAction("tap", { x: slot.x, y: slot.y });
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      }, 60000);
      intervalsRef.current.push(iv);
    }

    // Anti-AFK (every 120s)
    if (bot.antiAfk) {
      const iv = setInterval(async () => {
        await roAction("tap", { x: Math.floor(screenW / 2), y: Math.floor(screenH / 2) });
      }, 120000);
      intervalsRef.current.push(iv);
    }

    // Auto-farm with waypoints
    if (bot.autoFarm && wps.length > 0) {
      let wpIdx = 0;
      const iv = setInterval(async () => {
        const wp = wps[wpIdx % wps.length];
        addLog(`Farm: walking to ${wp.label} (${wp.x},${wp.y})`);
        // Walk via joystick swipe
        const dx = wp.x - gs.posX;
        const dy = wp.y - gs.posY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const dur = Math.min(3000, dist * 100);
          const jcx = 200, jcy = 1500, mr = 100;
          const ndx = (dx / dist) * mr;
          const ndy = (dy / dist) * mr;
          await roAction("swipe", { x1: jcx, y1: jcy, x2: jcx + ndx, y2: jcy + ndy, duration: dur });
        }
        // Attack at waypoint
        if (bot.autoSkill && bot.attackSkill > 0) {
          const slot = bot.skillSlots[bot.attackSkill - 1];
          if (slot) await roAction("tap", { x: slot.x, y: slot.y });
        }
        await roAction("tap", { x: bot.attackBtn.x, y: bot.attackBtn.y });
        if (bot.autoLoot) await roAction("tap", { x: bot.lootBtn.x, y: bot.lootBtn.y });
        wpIdx++;
      }, 5000);
      intervalsRef.current.push(iv);
    }
  }, [bot, gs, wps, screenW, screenH, roAction]);

  const stopBot = useCallback(() => {
    clearBotIntervals();
    addLog("BOT STOPPED");
  }, []);

  // Cleanup
  useEffect(() => {
    return () => clearBotIntervals();
  }, []);

  // Simulated game state updates (in real use, this would come from OCR/screen reading)
  useEffect(() => {
    if (!connected) return;
    const iv = setInterval(async () => {
      // In production, this would parse screenshot via OCR
      // For now, fetch from API
      try {
        const res = await fetch(`/api/ro/state?device=${encodeURIComponent(deviceId)}`);
        const data = await res.json();
        if (data) {
          setGs((prev) => ({
            ...prev,
            hp: data.hp ?? prev.hp,
            maxHp: data.maxHp ?? prev.maxHp,
            sp: data.sp ?? prev.sp,
            maxSp: data.maxSp ?? prev.maxSp,
            baseLevel: data.baseLevel ?? prev.baseLevel,
            jobLevel: data.jobLevel ?? prev.jobLevel,
            zeny: data.zeny ?? prev.zeny,
            posX: data.posX ?? prev.posX,
            posY: data.posY ?? prev.posY,
            mapName: data.mapName ?? prev.mapName,
            jobName: data.jobName ?? prev.jobName,
          }));
        }
      } catch {}
    }, 3000);
    return () => clearInterval(iv);
  }, [connected, deviceId]);

  const hpPct = gs.maxHp > 0 ? (gs.hp / gs.maxHp) * 100 : 0;
  const spPct = gs.maxSp > 0 ? (gs.sp / gs.maxSp) * 100 : 0;
  const targetHpPct = gs.targetMaxHp > 0 ? (gs.targetHp / gs.targetMaxHp) * 100 : 0;

  const SkillSlot = ({ idx }: { idx: number }) => {
    const pos = bot.skillSlots[idx - 1];
    return (
      <button
        onClick={() => pos && roAction("tap", { x: pos.x, y: pos.y })}
        className="w-9 h-9 border border-purple-700 text-purple-400 hover:bg-purple-900/40 font-mono text-xs rounded flex items-center justify-center transition-colors"
        title={`Skill ${idx} (${pos?.x},${pos?.y})`}
      >
        S{idx}
      </button>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* LEFT: Screen + Game State */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Screen Mirror */}
        <div className="border border-slate-800 rounded bg-slate-950 overflow-hidden">
          <div className="flex items-center gap-2 px-2 py-1 border-b border-slate-800">
            <span className="text-[10px] font-mono text-cyan-400 font-bold">SCREEN MIRROR</span>
            <div className="flex-1" />
            <button onClick={refreshScreen} className="text-[9px] font-mono text-slate-500 hover:text-cyan-400 px-1">REFRESH</button>
            <button onClick={() => setAutoScreen(!autoScreen)} className={`text-[9px] font-mono px-1 ${autoScreen ? "text-green-400" : "text-slate-500"}`}>
              {autoScreen ? "AUTO ON" : "AUTO OFF"}
            </button>
          </div>
          <div className="relative bg-black" style={{ aspectRatio: `${screenW}/${screenH}` }}>
            {screenUrl ? (
              <img src={screenUrl} alt="Phone Screen" className="w-full h-full object-contain" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-slate-600 font-mono text-xs">Connect device to see screen</p>
              </div>
            )}
            {/* Touch overlay for direct control */}
            {connected && (
              <div
                className="absolute inset-0 cursor-crosshair"
                onClick={async (e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.floor((e.clientX - rect.left) / rect.width * screenW);
                  const y = Math.floor((e.clientY - rect.top) / rect.height * screenH);
                  addLog(`Tap: (${x}, ${y})`);
                  await roAction("tap", { x, y });
                  if (autoScreen) setTimeout(refreshScreen, 500);
                }}
              />
            )}
          </div>
        </div>

        {/* Game State Display */}
        <div className="border border-slate-800 rounded bg-slate-950/80 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-cyan-400 font-bold">GAME STATE</span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${gameRunning ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
              {gameRunning ? "RUNNING" : "STOPPED"}
            </span>
            <div className="flex-1" />
            <button onClick={checkGame} className="text-[9px] font-mono text-slate-500 hover:text-white px-1">CHECK</button>
          </div>

          {/* HP/SP Bars */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-red-400 w-6">HP</span>
              <div className="flex-1 h-4 bg-slate-900 rounded overflow-hidden border border-slate-700">
                <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${hpPct}%` }} />
              </div>
              <span className="text-[9px] font-mono text-slate-400 w-20 text-right">{gs.hp}/{gs.maxHp}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-blue-400 w-6">SP</span>
              <div className="flex-1 h-4 bg-slate-900 rounded overflow-hidden border border-slate-700">
                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all" style={{ width: `${spPct}%` }} />
              </div>
              <span className="text-[9px] font-mono text-slate-400 w-20 text-right">{gs.sp}/{gs.maxSp}</span>
            </div>
            {gs.targetName && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-orange-400 w-6">TGT</span>
                <div className="flex-1 h-3 bg-slate-900 rounded overflow-hidden border border-slate-700">
                  <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all" style={{ width: `${targetHpPct}%` }} />
                </div>
                <span className="text-[9px] font-mono text-slate-400 w-20 text-right">{gs.targetName}</span>
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="border border-slate-800 rounded p-1">
              <p className="text-[8px] font-mono text-slate-500">BLv</p>
              <p className="text-xs font-mono text-yellow-400">{gs.baseLevel || "-"}</p>
            </div>
            <div className="border border-slate-800 rounded p-1">
              <p className="text-[8px] font-mono text-slate-500">JLv</p>
              <p className="text-xs font-mono text-purple-400">{gs.jobLevel || "-"}</p>
            </div>
            <div className="border border-slate-800 rounded p-1">
              <p className="text-[8px] font-mono text-slate-500">Zeny</p>
              <p className="text-xs font-mono text-yellow-400">{gs.zeny > 0 ? gs.zeny.toLocaleString() : "-"}</p>
            </div>
            <div className="border border-slate-800 rounded p-1">
              <p className="text-[8px] font-mono text-slate-500">Pos</p>
              <p className="text-[10px] font-mono text-cyan-400">{gs.posX},{gs.posY}</p>
            </div>
          </div>

          {/* Job/Map/Guild */}
          <div className="flex gap-3 text-[10px] font-mono">
            <span className="text-slate-500">Job: <span className="text-cyan-400">{gs.jobName || "-"}</span></span>
            <span className="text-slate-500">Map: <span className="text-green-400">{gs.mapName || "-"}</span></span>
            <span className="text-slate-500">Guild: <span className="text-yellow-400">{gs.guildName || "-"}</span></span>
            <span className="text-slate-500">Party: <span className="text-purple-400">{gs.partyName || "-"}</span></span>
          </div>
        </div>
      </div>

      {/* RIGHT: Controls */}
      <div className="w-full lg:w-96 space-y-3">
        {/* Tab selector */}
        <div className="flex gap-1">
        {([
          { id: "connect" as const, label: "Connect" },
          { id: "dashboard" as const, label: "Control" },
          { id: "bot" as const, label: "Bot" },
          { id: "macro" as const, label: "Macro" },
          { id: "system" as const, label: "System" },
        ]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 px-1 py-1 text-[10px] font-mono border transition-colors rounded-t ${
                tab === t.id ? "border-cyan-600 text-cyan-400 bg-cyan-950/40 border-b-0" : "border-slate-800 text-slate-500"
              }`}
            >{t.label}</button>
          ))}
        </div>

        <div className="border border-slate-800 rounded-b rounded-tr bg-slate-950/80 p-3 space-y-3">
          {/* ===== CONNECT TAB ===== */}
          {tab === "connect" && (
            <div className="space-y-3">
              <h3 className="text-[11px] font-mono font-bold text-cyan-400">Connection Setup</h3>

              {/* Step 1: Enable USB Debug */}
              <div className="border border-slate-700/50 rounded p-2 bg-slate-900/50">
                <p className="text-[10px] font-mono text-yellow-400 font-bold mb-1">Step 1: Enable USB Debugging</p>
                <ol className="text-[9px] font-mono text-slate-400 space-y-0.5 list-decimal list-inside">
                  <li>Settings &rarr; About Phone &rarr; Tap Build Number 7x</li>
                  <li>Settings &rarr; Developer Options &rarr; USB Debugging ON</li>
                  <li>Wireless Debugging ON (for WiFi)</li>
                </ol>
              </div>

              {/* USB Scan */}
              <div className="flex gap-2">
                <button onClick={scanDevices} className="flex-1 px-2 py-1.5 text-[10px] font-mono bg-green-900/40 border border-green-700 text-green-400 hover:bg-green-800/40 rounded">
                  SCAN USB
                </button>
                <button onClick={() => { setConnected(true); addLog("Connected (manual)"); }} className="px-2 py-1.5 text-[10px] font-mono border border-slate-700 text-slate-400 hover:text-white rounded">
                  MANUAL
                </button>
              </div>

              {/* Device list */}
              {devices.length > 0 && (
                <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300 px-2 py-1 rounded"
                >
                  {devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              )}

              {/* WiFi connect */}
              <div className="border border-slate-700/50 rounded p-2 bg-slate-900/50">
                <p className="text-[10px] font-mono text-yellow-400 font-bold mb-1">WiFi Connect (USB first then):</p>
                <button onClick={() => roAction("tcpip", { port: 5555 })} className="mb-1 px-2 py-0.5 text-[9px] font-mono border border-yellow-700 text-yellow-400 rounded">
                  adb tcpip 5555
                </button>
                <div className="flex gap-1 items-center">
                  <input value={connIp} onChange={(e) => setConnIp(e.target.value)} placeholder="192.168.1.x" className="flex-1 bg-slate-800 border border-slate-700 text-[10px] font-mono text-green-400 px-1 py-0.5 rounded placeholder:text-slate-600" />
                  <span className="text-slate-600 text-[10px]">:</span>
                  <input value={connPort} onChange={(e) => setConnPort(e.target.value)} className="w-12 bg-slate-800 border border-slate-700 text-[10px] font-mono text-green-400 px-1 py-0.5 rounded" />
                  <button onClick={() => roAction("connect_adb", { ip: connIp, port: +connPort })} className="px-2 py-0.5 text-[9px] font-mono border border-green-700 text-green-400 rounded">GO</button>
                </div>
              </div>

              {/* Wireless Pairing */}
              <div className="border border-slate-700/50 rounded p-2 bg-slate-900/50">
                <p className="text-[10px] font-mono text-yellow-400 font-bold mb-1">Wireless Pair (Android 11+, no USB):</p>
                <div className="flex gap-1 items-center flex-wrap">
                  <input value={pairIp} onChange={(e) => setPairIp(e.target.value)} placeholder="IP" className="w-20 bg-slate-800 border border-slate-700 text-[10px] font-mono text-yellow-400 px-1 py-0.5 rounded placeholder:text-slate-600" />
                  <span className="text-slate-600 text-[10px]">:</span>
                  <input value={pairPort} onChange={(e) => setPairPort(e.target.value)} placeholder="Port" className="w-14 bg-slate-800 border border-slate-700 text-[10px] font-mono text-yellow-400 px-1 py-0.5 rounded placeholder:text-slate-600" />
                  <input value={pairCode} onChange={(e) => setPairCode(e.target.value)} placeholder="Code" className="w-14 bg-slate-800 border border-slate-700 text-[10px] font-mono text-yellow-400 px-1 py-0.5 rounded placeholder:text-slate-600" />
                  <button onClick={() => roAction("pair_adb", { ip: pairIp, port: +pairPort, code: pairCode })} className="px-2 py-0.5 text-[9px] font-mono border border-yellow-700 text-yellow-400 rounded">PAIR</button>
                </div>
              </div>

              {/* Launch game */}
              <div className="border border-slate-700/50 rounded p-2 bg-slate-900/50">
                <p className="text-[10px] font-mono text-cyan-400 font-bold mb-1">Game: Ragnarok - The New World</p>
                <p className="text-[9px] font-mono text-slate-500 mb-1">{PKG}</p>
                <div className="flex gap-1">
                  <button onClick={() => roAction("launch")} className="flex-1 px-2 py-1 text-[10px] font-mono bg-green-900/40 border border-green-700 text-green-400 rounded">LAUNCH</button>
                  <button onClick={checkGame} className="px-2 py-1 text-[10px] font-mono border border-slate-700 text-slate-400 rounded">STATUS</button>
                  <button onClick={() => roAction("stop")} className="px-2 py-1 text-[10px] font-mono border border-red-700 text-red-400 rounded">STOP</button>
                </div>
              </div>

              {/* Screen size */}
              <div className="flex gap-2 items-center">
                <span className="text-[9px] font-mono text-slate-500">Screen:</span>
                <input type="number" value={screenW} onChange={(e) => setScreenW(+e.target.value)} className="w-14 bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 px-1 py-0.5 rounded" />
                <span className="text-slate-600 text-[10px]">x</span>
                <input type="number" value={screenH} onChange={(e) => setScreenH(+e.target.value)} className="w-14 bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 px-1 py-0.5 rounded" />
                <button onClick={() => roAction("screen_size")} className="px-2 py-0.5 text-[9px] font-mono border border-slate-700 text-slate-400 rounded">DETECT</button>
              </div>
            </div>
          )}

          {/* ===== CONTROL TAB ===== */}
          {tab === "dashboard" && (
            <div className="space-y-3">
              <h3 className="text-[11px] font-mono font-bold text-cyan-400">Game Control</h3>

              {/* D-Pad */}
              <div className="flex flex-col items-center gap-1">
                <p className="text-[9px] font-mono text-slate-500">Movement</p>
                <button onClick={() => roAction("swipe", { x1: 200, y1: 1500, x2: 200, y2: 1300, duration: 500 })} className="w-10 h-10 border border-cyan-800 text-cyan-400 hover:bg-cyan-900/30 font-mono rounded text-sm">▲</button>
                <div className="flex gap-1">
                  <button onClick={() => roAction("swipe", { x1: 200, y1: 1500, x2: 100, y2: 1500, duration: 500 })} className="w-10 h-10 border border-cyan-800 text-cyan-400 hover:bg-cyan-900/30 font-mono rounded text-sm">◀</button>
                  <button onClick={() => roAction("tap", { x: Math.floor(screenW / 2), y: Math.floor(screenH / 2) })} className="w-10 h-10 border border-yellow-700 text-yellow-400 hover:bg-yellow-900/30 font-mono rounded text-xs">●</button>
                  <button onClick={() => roAction("swipe", { x1: 200, y1: 1500, x2: 300, y2: 1500, duration: 500 })} className="w-10 h-10 border border-cyan-800 text-cyan-400 hover:bg-cyan-900/30 font-mono rounded text-sm">▶</button>
                </div>
                <button onClick={() => roAction("swipe", { x1: 200, y1: 1500, x2: 200, y2: 1700, duration: 500 })} className="w-10 h-10 border border-cyan-800 text-cyan-400 hover:bg-cyan-900/30 font-mono rounded text-sm">▼</button>
              </div>

              {/* Skill slots */}
              <div>
                <p className="text-[9px] font-mono text-slate-500 mb-1">Skills</p>
                <div className="grid grid-cols-5 gap-1">
                  {[1,2,3,4,5,6,7,8,9].map((i) => <SkillSlot key={i} idx={i} />)}
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-3 gap-1">
                <button onClick={() => roAction("tap", { x: bot.attackBtn.x, y: bot.attackBtn.y })} className="px-1 py-1.5 text-[9px] font-mono border border-red-700 text-red-400 rounded">ATK</button>
                <button onClick={() => roAction("tap", { x: bot.potBtn.x, y: bot.potBtn.y })} className="px-1 py-1.5 text-[9px] font-mono border border-green-700 text-green-400 rounded">POT</button>
                <button onClick={() => roAction("tap", { x: bot.lootBtn.x, y: bot.lootBtn.y })} className="px-1 py-1.5 text-[9px] font-mono border border-yellow-700 text-yellow-400 rounded">LOOT</button>
                <button onClick={() => roAction("tap", { x: bot.autoBtn.x, y: bot.autoBtn.y })} className="px-1 py-1.5 text-[9px] font-mono border border-cyan-700 text-cyan-400 rounded">AUTO</button>
                <button onClick={() => roAction("keyevent", { keycode: 4 })} className="px-1 py-1.5 text-[9px] font-mono border border-slate-700 text-slate-400 rounded">BACK</button>
                <button onClick={() => roAction("screenshot").then(() => { setScreenUrl(`/api/ro/screen?device=${deviceId}&t=${Date.now()}`); })} className="px-1 py-1.5 text-[9px] font-mono border border-slate-700 text-slate-400 rounded">SNAP</button>
              </div>

              {/* Custom tap */}
              <div className="flex gap-1 items-center">
                <span className="text-[9px] font-mono text-slate-500">Tap:</span>
                <input type="number" defaultValue={540} id="ctx" className="w-12 bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 px-1 py-0.5 rounded" />
                <input type="number" defaultValue={960} id="cty" className="w-12 bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 px-1 py-0.5 rounded" />
                <button onClick={() => { const x = +(document.getElementById("ctx") as HTMLInputElement)?.value; const y = +(document.getElementById("cty") as HTMLInputElement)?.value; roAction("tap", { x, y }); }} className="px-2 py-0.5 text-[9px] font-mono border border-cyan-700 text-cyan-400 rounded">TAP</button>
              </div>

              {/* ADB Console */}
              <div>
                <p className="text-[9px] font-mono text-slate-500 mb-1">ADB Console</p>
                <div className="flex gap-1">
                  <input id="adb-input" type="text" placeholder="shell ..." className="flex-1 bg-slate-800 border border-slate-700 text-[10px] font-mono text-green-400 px-1 py-0.5 rounded placeholder:text-slate-600"
                    onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value; if (v) { adbCmd(v); (e.target as HTMLInputElement).value = ""; } }}}
                  />
                  <button onClick={() => { const v = (document.getElementById("adb-input") as HTMLInputElement)?.value; if (v) { adbCmd(v); (document.getElementById("adb-input") as HTMLInputElement).value = ""; } }} className="px-2 py-0.5 text-[9px] font-mono border border-cyan-700 text-cyan-400 rounded">RUN</button>
                </div>
              </div>
            </div>
          )}

          {/* ===== BOT TAB ===== */}
          {tab === "bot" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-mono font-bold text-cyan-400">Bot Automation</h3>
                <div className="flex gap-1">
                  <button onClick={startBot} className="px-2 py-1 text-[9px] font-mono bg-green-900/40 border border-green-700 text-green-400 rounded">START</button>
                  <button onClick={stopBot} className="px-2 py-1 text-[9px] font-mono bg-red-900/40 border border-red-700 text-red-400 rounded">STOP</button>
                </div>
              </div>

              {/* Toggle grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { key: "autoAttack" as const, label: "Auto Attack", color: "red" },
                  { key: "autoSkill" as const, label: "Auto Skill", color: "purple" },
                  { key: "autoPot" as const, label: "Auto Pot", color: "green" },
                  { key: "autoLoot" as const, label: "Auto Loot", color: "yellow" },
                  { key: "autoBuff" as const, label: "Auto Buff", color: "blue" },
                  { key: "autoHealParty" as const, label: "Heal Party", color: "cyan" },
                  { key: "autoFarm" as const, label: "Auto Farm", color: "orange" },
                  { key: "antiAfk" as const, label: "Anti-AFK", color: "slate" },
                ]).map(({ key, label, color }) => (
                  <button key={key} onClick={() => setBot((b) => ({ ...b, [key]: !b[key] }))}
                    className={`flex items-center gap-1.5 px-2 py-1.5 border rounded transition-colors text-[9px] font-mono ${
                      bot[key] ? `border-${color}-600 text-${color}-400 bg-${color}-950/40` : "border-slate-700 text-slate-500"
                    }`}
                    style={bot[key] ? { borderColor: `var(--tw-color-${color}-600, #525252)`, color: `var(--tw-color-${color}-400, #9ca3af)` } : {}}
                  >
                    <span className={`w-2 h-2 rounded-full ${bot[key] ? "bg-green-400" : "bg-slate-600"}`} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Thresholds */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-mono text-slate-500 font-bold">Thresholds</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-red-400 w-20">HP Pot &lt;</span>
                  <input type="range" min={10} max={90} value={bot.hpPotThreshold} onChange={(e) => setBot((b) => ({ ...b, hpPotThreshold: +e.target.value }))} className="flex-1" />
                  <span className="text-[9px] font-mono text-slate-400 w-6">{bot.hpPotThreshold}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-blue-400 w-20">SP Pot &lt;</span>
                  <input type="range" min={10} max={90} value={bot.spPotThreshold} onChange={(e) => setBot((b) => ({ ...b, spPotThreshold: +e.target.value }))} className="flex-1" />
                  <span className="text-[9px] font-mono text-slate-400 w-6">{bot.spPotThreshold}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-red-500 w-20">Emergency &lt;</span>
                  <input type="range" min={5} max={50} value={bot.hpEmergencyThreshold} onChange={(e) => setBot((b) => ({ ...b, hpEmergencyThreshold: +e.target.value }))} className="flex-1" />
                  <span className="text-[9px] font-mono text-slate-400 w-6">{bot.hpEmergencyThreshold}%</span>
                </div>
              </div>

              {/* Skill config */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-mono text-slate-500 font-bold">Skill Config</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-slate-400">Attack Skill:</span>
                  <select value={bot.attackSkill} onChange={(e) => setBot((b) => ({ ...b, attackSkill: +e.target.value }))} className="bg-slate-800 border border-slate-700 text-[10px] font-mono text-purple-400 px-1 py-0.5 rounded">
                    {[1,2,3,4,5,6,7,8,9].map((i) => <option key={i} value={i}>Slot {i}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-slate-400">Heal Skill:</span>
                  <select value={bot.healSkill} onChange={(e) => setBot((b) => ({ ...b, healSkill: +e.target.value }))} className="bg-slate-800 border border-slate-700 text-[10px] font-mono text-green-400 px-1 py-0.5 rounded">
                    {[1,2,3,4,5,6,7,8,9].map((i) => <option key={i} value={i}>Slot {i}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-slate-400">AOE Skill:</span>
                  <select value={bot.aoeSkill} onChange={(e) => setBot((b) => ({ ...b, aoeSkill: +e.target.value }))} className="bg-slate-800 border border-slate-700 text-[10px] font-mono text-orange-400 px-1 py-0.5 rounded">
                    {[1,2,3,4,5,6,7,8,9].map((i) => <option key={i} value={i}>Slot {i}</option>)}
                  </select>
                </div>
              </div>

              {/* Job info */}
              <div className="border border-slate-700/50 rounded p-2 bg-slate-900/50">
                <p className="text-[9px] font-mono text-slate-500 font-bold mb-1">Job Skills Reference</p>
                <select id="job-select" className="w-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 px-1 py-0.5 rounded mb-1">
                  {Object.keys(RO_JOBS).map((j) => <option key={j} value={j}>{RO_JOBS[j].name}</option>)}
                </select>
                <div className="text-[8px] font-mono text-slate-400">
                  {RO_JOBS[Object.keys(RO_JOBS)[0]]?.skills.join(", ")}
                </div>
              </div>
            </div>
          )}

      {/* ===== SYSTEM TAB ===== */}
      {tab === "system" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="space-y-2">
            <LoginPin />
            <ProfileManager />
            <ScheduleTimer />
          </div>
          <div className="space-y-2">
            <AntiDetectPanel />
            <SafetyPanel />
            <AutoLoginPanel />
          </div>
          <div className="space-y-2">
            <StatisticsPanel />
          </div>
        </div>
      )}

      {/* ===== MACRO TAB ===== */}
      {tab === "macro" && (
            <div className="space-y-3">
              <h3 className="text-[11px] font-mono font-bold text-cyan-400">Macro / Waypoints</h3>

              {/* Waypoints */}
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-slate-500 font-bold">Waypoints (auto-farm path)</p>
                {wps.map((wp, i) => (
                  <div key={wp.id} className="flex items-center gap-1 border border-slate-800 rounded p-1 bg-slate-900/50">
                    <span className="text-[9px] font-mono text-slate-500 w-3">{i + 1}</span>
                    <span className="text-[9px] font-mono text-cyan-400 flex-1">{wp.label}</span>
                    <span className="text-[8px] font-mono text-slate-600">({wp.x},{wp.y})</span>
                    <button onClick={() => setWps(wps.filter((_, j) => j !== i))} className="text-red-400 text-[9px]">x</button>
                  </div>
                ))}
                <div className="flex gap-1 items-center">
                  <input value={newWpLabel} onChange={(e) => setNewWpLabel(e.target.value)} placeholder="Label" className="flex-1 bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 px-1 py-0.5 rounded placeholder:text-slate-600" />
                  <input type="number" value={newWpX} onChange={(e) => setNewWpX(+e.target.value)} placeholder="X" className="w-10 bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 px-1 py-0.5 rounded" />
                  <input type="number" value={newWpY} onChange={(e) => setNewWpY(+e.target.value)} placeholder="Y" className="w-10 bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 px-1 py-0.5 rounded" />
                  <button onClick={() => {
                    if (newWpLabel) {
                      setWps([...wps, { id: Date.now().toString(), x: newWpX, y: newWpY, mapName: gs.mapName, label: newWpLabel }]);
                      setNewWpLabel(""); setNewWpX(0); setNewWpY(0);
                    }
                  }} className="px-2 py-0.5 text-[9px] font-mono border border-cyan-700 text-cyan-400 rounded">+</button>
                </div>
              </div>

              {/* Run waypoint path */}
              {wps.length > 0 && (
                <button onClick={async () => {
                  addLog("Running waypoint path...");
                  for (const wp of wps) {
                    addLog(`Walk to ${wp.label} (${wp.x},${wp.y})`);
                    await roAction("tap", { x: wp.x, y: wp.y });
                    await new Promise((r) => setTimeout(r, 2000));
                    if (bot.autoAttack) {
                      await roAction("tap", { x: bot.attackBtn.x, y: bot.attackBtn.y });
                      await new Promise((r) => setTimeout(r, bot.attackInterval));
                    }
                  }
                  addLog("Path complete!");
                }} className="w-full px-2 py-1.5 text-[10px] font-mono bg-green-900/40 border border-green-700 text-green-400 rounded">
                  RUN PATH ({wps.length} points)
                </button>
              )}

              {/* Preset macros */}
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-slate-500 font-bold">Quick Macros</p>
                <button onClick={async () => {
                  addLog("Auto-farm: 30 attacks");
                  for (let i = 0; i < 30; i++) {
                    if (bot.autoSkill) {
                      const slot = bot.skillSlots[bot.attackSkill - 1];
                      if (slot) await roAction("tap", { x: slot.x, y: slot.y });
                    }
                    await roAction("tap", { x: bot.attackBtn.x, y: bot.attackBtn.y });
                    await new Promise((r) => setTimeout(r, bot.attackInterval));
                    if (bot.autoLoot) await roAction("tap", { x: bot.lootBtn.x, y: bot.lootBtn.y });
                  }
                  addLog("Farm done!");
                }} className="w-full px-2 py-1 text-[9px] font-mono border border-orange-700 text-orange-400 rounded hover:bg-orange-900/30">
                  Farm x30 attacks
                </button>
                <button onClick={async () => {
                  addLog("Buffing...");
                  for (const idx of [1, 2, 3, 4, 5]) {
                    const slot = bot.skillSlots[idx - 1];
                    if (slot) {
                      await roAction("tap", { x: slot.x, y: slot.y });
                      await new Promise((r) => setTimeout(r, 2000));
                    }
                  }
                  addLog("Buffs done!");
                }} className="w-full px-2 py-1 text-[9px] font-mono border border-blue-700 text-blue-400 rounded hover:bg-blue-900/30">
                  Buff All (S1-S5)
                </button>
              </div>

              {/* Coordinate calibration help */}
              <div className="border border-yellow-800/50 rounded p-2 bg-yellow-950/20">
                <p className="text-[9px] font-mono text-yellow-500 font-bold mb-1">Calibration Help</p>
                <p className="text-[8px] font-mono text-yellow-600/80">
                  Click on the screen mirror to find coordinates. Use &quot;adb shell getevent&quot; on your phone to verify touch positions. Adjust skill/pot positions in bot config to match your game UI layout.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Log */}
        <div className="border border-slate-800 rounded bg-slate-950/80">
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800">
            <span className="text-[9px] font-mono text-slate-500">LOG</span>
            <button onClick={() => setLog([])} className="text-[9px] font-mono text-slate-600 hover:text-slate-400">CLEAR</button>
          </div>
          <div ref={logRef} className="h-32 overflow-auto p-1.5">
            {log.map((l, i) => (
              <p key={i} className={`text-[8px] font-mono ${l.includes("ERR") ? "text-red-400" : l.includes("BOT") ? "text-yellow-400" : "text-slate-500"}`}>{l}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
