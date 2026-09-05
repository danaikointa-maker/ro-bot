"use client";

import React, { useState, useEffect } from "react";

export default function LoginPin() {
  const [pin, setPin] = useState("");
  const [locked, setLocked] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("ro_pin_set");
    if (saved) {
      // PIN already set — ask for it on load
      setLocked(true);
    } else {
      // First time — set PIN
      setLocked(false); // Actually ask to set
    }
  }, []);

  const handleSubmit = () => {
    const correct = localStorage.getItem("ro_pin") || "1234";
    if (pin === correct) {
      setLocked(false);
      setAttempts(0);
    } else {
      setAttempts((a) => a + 1);
      if (attempts >= 2) {
        alert("Too many attempts. Default PIN: 1234");
      }
    }
    setPin("");
  };

  if (!locked) {
    return (
      <div className="text-[9px] font-mono text-green-400 flex items-center gap-1">
        <span>🔓 Unlocked</span>
        <button onClick={() => setLocked(true)} className="text-slate-600 hover:text-red-400">Lock</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded px-2 py-1">
      <span className="text-[10px] font-mono text-yellow-400">🔐 PIN:</span>
      <input
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
        className="w-16 bg-slate-900 border border-slate-700 text-xs font-mono text-white px-1 py-0.5 rounded text-center placeholder:text-slate-600"
        placeholder="===="
      />
      <button onClick={handleSubmit} className="px-2 py-0.5 text-[10px] font-mono bg-cyan-900/40 border border-cyan-700 text-cyan-400 hover:bg-cyan-800/50 rounded">GO</button>
      <span className="text-[9px] font-mono text-slate-600">{attempts > 0 ? `(${attempts} attempts)` : ""}</span>
    </div>
  );
}
