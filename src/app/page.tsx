"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/components/Dashboard"), { ssr: false });
const MultiDevicePanel = dynamic(() => import("@/components/MultiDevicePanel"), { ssr: false });

export default function HomePage() {
  const [selectedDevice, setSelectedDevice] = useState("");

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-200 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/50 px-3 py-2 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 border-2 border-cyan-400 rotate-45 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-cyan-400 rotate-[-45deg]" />
            </div>
            <div>
              <h1 className="text-sm font-mono font-bold tracking-wider leading-none">
                <span className="text-cyan-400">RO</span>
                <span className="text-slate-300"> BOT</span>
              </h1>
              <p className="text-[8px] font-mono text-slate-600 leading-none mt-0.5">Multi-Device ADB Control v2.0</p>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <a href="/setup" className="px-2 py-1 text-[9px] font-mono border border-yellow-700 text-yellow-400 hover:bg-yellow-900/30 transition-colors rounded">SETUP</a>
            <span className="text-[9px] font-mono text-slate-600 hidden sm:block border border-slate-800 px-1.5 py-0.5 rounded">com.ggv.roworldsea.aos</span>
            <a
              href="https://play.google.com/store/apps/details?id=com.ggv.roworldsea.aos"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 text-[9px] font-mono border border-slate-700 text-slate-500 hover:text-cyan-400 hover:border-cyan-700 transition-colors rounded hidden sm:block"
            >
              Play Store ↗
            </a>
          </div>
        </div>
      </header>

      {/* Info bar */}
      <div className="border-b border-slate-800/30 px-3 py-1 bg-slate-950/50 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-4 text-[9px] font-mono text-slate-500 overflow-x-auto">
          <span className="text-cyan-500 whitespace-nowrap">Ragnarok: The New World</span>
          <span className="text-slate-700">|</span>
          <span className="whitespace-nowrap">Connect: <span className="text-yellow-400">ADB</span> / <span className="text-green-400">WiFi</span> / <span className="text-purple-400">APK Agent</span></span>
          <span className="text-slate-700">|</span>
          <span className="whitespace-nowrap">Multi-Device: <span className="text-red-400">Attack</span> + <span className="text-green-400">Farm</span> + <span className="text-blue-400">Party</span> + <span className="text-purple-400">Skill</span></span>
          <div className="flex-1" />
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            ONLINE
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-3 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Multi-Device Panel */}
          <MultiDevicePanel
            selected={selectedDevice}
            onSelect={setSelectedDevice}
            onConnect={(_id: string) => { setSelectedDevice(_id); }}
            onScan={() => {}}
          />
          <Dashboard />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/30 px-4 py-2 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[8px] font-mono text-slate-600">
          <div className="flex items-center gap-3">
            <span>RO Bot v2.0</span>
            <span className="text-slate-700">|</span>
            <span>Server ↔ Client ↔ ADB ↔ APK Agent</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Multi-Device Support</span>
            <span className="text-slate-700">|</span>
            <span>Screen Mirror + Bot Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
