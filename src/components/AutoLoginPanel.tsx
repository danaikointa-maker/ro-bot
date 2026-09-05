"use client";

import React from "react";

export default function AutoLoginPanel() {
  return (
    <div className="border border-slate-800 rounded bg-slate-950/80 p-3 space-y-2">
      <h3 className="text-xs font-mono font-bold text-cyan-400">🔄 Auto-Login / Reconnect</h3>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => alert("Auto-Login: Launch game + wait for login screen + input credentials (if saved)")} 
          className="px-2 py-1.5 text-[10px] font-mono bg-green-900/30 border border-green-700 text-green-400 rounded hover:bg-green-900/50"
        >
          AUTO LOGIN
        </button>
        <button onClick={() => alert("Reconnect ADB if disconnected, then resume bot")}
          className="px-2 py-1.5 text-[10px] font-mono bg-blue-900/30 border border-blue-700 text-blue-400 rounded hover:bg-blue-900/50"
        >
          RECONNECT
        </button>
      </div>

      <div className="text-[9px] font-mono text-slate-500 space-y-1">
        <p><span className="text-green-400">✓ Auto-Login:</span> เปิดเกม → รอ 5 วินาที → กดปุ่ม (ถ้ามี PIN/Account)</p>
        <p><span className="text-blue-400">✓ Reconnect:</span> ถ้า ADB disconnect → reconnect + resume bot</p>
        <p><span className="text-yellow-400">⚠ Safety:</span> หยุด bot ถ้า HP &lt; 20% หรือ disconnect เกิน 30 วินาที</p>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
        <span>Status:</span>
        <span className="text-green-400">Connected</span>
        <span className="text-slate-600">|</span>
        <span>Last reconnect: 2m ago</span>
      </div>
    </div>
  );
}
