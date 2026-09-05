"use client";

import React, { useState, useEffect, useCallback } from "react";

export default function AntiDetectPanel() {
  const [enabled, setEnabled] = useState(true);
  const [minDelayMs, setMinDelayMs] = useState(150);
  const [maxDelayMs, setMaxDelayMs] = useState(800);
  const [humanSwipe, setHumanSwipe] = useState(true);
  const [randomPath, setRandomPath] = useState(true);
  const [lastActionMs, setLastActionMs] = useState(0);

  // Random delay helper
  const getDelay = () => Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;

  const applyDelay = useCallback(async (callback: () => Promise<any>) => {
    if (!enabled) return await callback();
    const delay = getDelay();
    setLastActionMs(delay);
    await new Promise((r) => setTimeout(r, delay));
    return await callback();
  }, [enabled, minDelayMs, maxDelayMs]);

  useEffect(() => {
    // Auto-fade last action
    const iv = setInterval(() => {
      if (lastActionMs > 0) setLastActionMs((v) => Math.max(0, v - 100));
    }, 500);
    return () => clearInterval(iv);
  }, [lastActionMs]);

  return (
    <div className="border border-slate-800 rounded bg-slate-950/80 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold text-red-400">🛡 Anti-Detection</h3>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-2 py-0.5 text-[10px] font-mono border rounded transition-colors ${
            enabled ? "bg-red-900/40 border-red-600 text-red-400" : "bg-slate-800 border-slate-600 text-slate-500"
          }`}
        >
          {enabled ? "ON" : "OFF"}
        </button>
      </div>

      <p className="text-[9px] font-mono text-slate-500">
        สุ่มดีเลย์ + เคลื่อนไหวเหมือนคนจริง เพื่อหลีกเลี่ยงการตรวจจับจาก GameGuard / Anti-Bot
      </p>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-slate-500 w-16">Min Delay</span>
          <input type="range" min={50} max={2000} step={50} value={minDelayMs} onChange={(e) => setMinDelayMs(+e.target.value)} className="flex-1" />
          <span className="text-[10px] font-mono text-cyan-400 w-14">{minDelayMs}ms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-slate-500 w-16">Max Delay</span>
          <input type="range" min={200} max={3000} step={50} value={maxDelayMs} onChange={(e) => setMaxDelayMs(+e.target.value)} className="flex-1" />
          <span className="text-[10px] font-mono text-cyan-400 w-14">{maxDelayMs}ms</span>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-2">
        <button onClick={() => setHumanSwipe(!humanSwipe)} className={`flex-1 px-1 py-0.5 text-[9px] font-mono border rounded ${humanSwipe ? "border-purple-600 text-purple-400 bg-purple-950/30" : "border-slate-700 text-slate-600"}`}>
          Human Swipe: {humanSwipe ? "ON" : "OFF"}
        </button>
        <button onClick={() => setRandomPath(!randomPath)} className={`flex-1 px-1 py-0.5 text-[9px] font-mono border rounded ${randomPath ? "border-orange-600 text-orange-400 bg-orange-950/30" : "border-slate-700 text-slate-600"}`}>
          Random Path: {randomPath ? "ON" : "OFF"}
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 text-[9px] font-mono">
        <span className="text-slate-500">Last delay:</span>
        <span className={`font-bold ${lastActionMs > 0 ? "text-green-400" : "text-slate-600"}`}>{lastActionMs}ms</span>
        <span className="text-slate-700">|</span>
        <span className="text-slate-500">Pattern:</span>
        <span className="text-cyan-400">{humanSwipe ? "curved" : "linear"}</span>
        <span className="text-slate-700">|</span>
        <span className="text-slate-500">Path:</span>
        <span className="text-orange-400">{randomPath ? "random" : "direct"}</span>
      </div>
    </div>
  );
}
