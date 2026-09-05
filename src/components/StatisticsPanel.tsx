"use client";

import React, { useState, useEffect, useRef } from "react";

interface StatsRecord {
  time: string;
  kills: number;
  score: number;
  hp: number;
  map: string;
  durationSec: number;
}

export default function StatisticsPanel() {
  const [records, setRecords] = useState<StatsRecord[]>([
    { time: "20:00", kills: 12, score: 2400, hp: 85, map: "Geffen", durationSec: 600 },
    { time: "21:30", kills: 45, score: 8900, hp: 60, map: "Payon", durationSec: 1800 },
    { time: "23:00", kills: 88, score: 15200, hp: 25, map: "Morroc", durationSec: 3600 },
  ]);
  const [sessionStart, setSessionStart] = useState(Date.now());
  const [kills, setKills] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  // Auto-calculate XP rate
  const sessionMin = Math.floor((Date.now() - sessionStart) / 60000) || 1;
  const xpPerHour = Math.round(kills * 60 / sessionMin);
  const killsPerHour = Math.round(kills * 60 / sessionMin);

  return (
    <div className="border border-slate-800 rounded bg-slate-950/80 p-3 space-y-2">
      <h3 className="text-xs font-mono font-bold text-cyan-400">📊 Statistics</h3>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="border border-slate-800 rounded p-1.5 text-center">
          <p className="text-[8px] font-mono text-slate-500">Kills</p>
          <p className="text-sm font-mono text-red-400 font-bold">{kills}</p>
        </div>
        <div className="border border-slate-800 rounded p-1.5 text-center">
          <p className="text-[8px] font-mono text-slate-500">Score</p>
          <p className="text-sm font-mono text-yellow-400 font-bold">{totalScore}</p>
        </div>
        <div className="border border-slate-800 rounded p-1.5 text-center">
          <p className="text-[8px] font-mono text-slate-500">XP/hr</p>
          <p className="text-sm font-mono text-green-400 font-bold">{xpPerHour}</p>
        </div>
        <div className="border border-slate-800 rounded p-1.5 text-center">
          <p className="text-[8px] font-mono text-slate-500">Kill/hr</p>
          <p className="text-sm font-mono text-purple-400 font-bold">{killsPerHour}</p>
        </div>
      </div>

      {/* Mini chart */}
      <div>
        <p className="text-[9px] font-mono text-slate-500 mb-1">Kill Rate (last session)</p>
        <div className="h-16 bg-slate-900 rounded border border-slate-800 p-1 flex items-end gap-0.5">
          {[40, 65, 80, 55, 90, 75, 100, 60, 85].map((h, i) => (
            <div key={i} className="flex-1 bg-gradient-to-t from-cyan-900 to-cyan-400 rounded-t" style={{ height: `${h}%`, opacity: 0.7 + i * 0.03 }} />
          ))}
        </div>
      </div>

      {/* History */}
      <div>
        <p className="text-[9px] font-mono text-slate-500 mb-1">Recent Sessions</p>
        <div className="max-h-24 overflow-auto space-y-0.5">
          {records.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-[9px] font-mono border-b border-slate-800/50 py-0.5">
              <span className="text-slate-500 w-10">{r.time}</span>
              <span className="text-red-400 w-6">{r.kills}K</span>
              <span className="text-yellow-400 w-10">{r.score}</span>
              <span className="text-cyan-400 w-16">{r.map}</span>
              <span className="text-slate-600">{Math.round(r.durationSec/60)}m</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[8px] font-mono text-slate-600">Session: {sessionMin} min | Auto-calculated from bot actions</p>
    </div>
  );
}
