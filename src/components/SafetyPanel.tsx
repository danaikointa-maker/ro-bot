"use client";

import React, { useState, useEffect } from "react";

export default function SafetyPanel() {
  const [rules, setRules] = useState([
    { id: 1, name: "HP < 30% → Stop", enabled: true, action: "stop_bot" },
    { id: 2, name: "Disconnected > 60s → Reconnect", enabled: true, action: "reconnect" },
    { id: 3, name: "Anti-Detection ON", enabled: true, action: "delay" },
    { id: 4, name: "No tap > 2 min → Anti-AFK", enabled: true, action: "afk_tap" },
    { id: 5, name: "Chat command /stop → Halt", enabled: true, action: "chat_stop" },
  ]);
  const [logs, setLogs] = useState<string[]>([
    "[20:01] Safety: HP 85% OK",
    "[20:05] Safety: Auto-potion triggered (HP 28%)",
    "[20:12] Safety: Anti-detect delay applied (850ms)",
    "[20:30] Safety: Bot stopped — schedule end",
  ]);

  const toggleRule = (id: number) => {
    setRules(rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="border border-slate-800 rounded bg-slate-950/80 p-3 space-y-2">
      <h3 className="text-xs font-mono font-bold text-red-400">🛡 Safety Rules</h3>

      <div className="space-y-1">
        {rules.map((r) => (
          <button
            key={r.id}
            onClick={() => toggleRule(r.id)}
            className={`w-full flex items-center gap-2 px-2 py-1 text-[9px] font-mono border rounded transition-colors text-left ${
              r.enabled ? "border-green-700 text-green-400 bg-green-950/20" : "border-slate-800 text-slate-600"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${r.enabled ? "bg-green-400" : "bg-slate-700"}`} />
            <span className="flex-1">{r.name}</span>
            <span className="text-[8px] text-slate-500">{r.action}</span>
          </button>
        ))}
      </div>

      {/* Safety log */}
      <div className="border-t border-slate-800 pt-2">
        <p className="text-[9px] font-mono text-slate-500 mb-1">Safety Log</p>
        <div className="max-h-24 overflow-auto space-y-0.5">
          {logs.map((l, i) => (
            <p key={i} className="text-[8px] font-mono text-slate-500">{l}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
