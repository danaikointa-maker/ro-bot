"use client";

import React, { useState, useEffect } from "react";

export default function ScheduleTimer() {
  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState("20:00");
  const [endTime, setEndTime] = useState("23:00");
  const [mode, setMode] = useState<"farm" | "pvp" | "buff">("farm");
  const [nextRun, setNextRun] = useState("");

  useEffect(() => {
    const now = new Date();
    const [h, m] = startTime.split(":").map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    if (target < now) target.setDate(target.getDate() + 1);
    setNextRun(target.toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit" }));
  }, [startTime]);

  return (
    <div className="border border-slate-800 rounded bg-slate-950/80 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold text-cyan-400">⏱ Schedule Timer</h3>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-2 py-0.5 text-[10px] font-mono border rounded ${enabled ? "bg-green-900/40 border-green-600 text-green-400" : "bg-slate-800 border-slate-600 text-slate-400"}`}
        >
          {enabled ? "ENABLED" : "OFF"}
        </button>
      </div>

      <p className="text-[9px] font-mono text-slate-500">Auto-start / stop bot at scheduled times</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-mono text-slate-500">Start</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-green-400 px-1 py-0.5 rounded" />
        </div>
        <div>
          <label className="text-[9px] font-mono text-slate-500">End</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-red-400 px-1 py-0.5 rounded" />
        </div>
      </div>

      <div className="flex gap-1">
        {(["farm", "pvp", "buff"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 py-0.5 text-[9px] font-mono border rounded uppercase ${mode === m ? "border-cyan-600 text-cyan-400 bg-cyan-950/30" : "border-slate-700 text-slate-500"}`}>
            {m}
          </button>
        ))}
      </div>

      <div className="text-[9px] font-mono text-slate-400">
        <span className="text-green-400">Next run: {nextRun}</span> | Mode: <span className="text-cyan-400">{mode}</span>
      </div>
    </div>
  );
}
