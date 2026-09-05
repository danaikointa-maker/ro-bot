"use client";

import React, { useState, useEffect, useCallback } from "react";

interface ToolInfo {
  name: string; key: string; installed: boolean; version: string;
  required: boolean; category: string; downloadUrl: string; installCmd: string; description: string;
}

interface SetupData {
  tools: ToolInfo[];
  pyLibs: Record<string, boolean>;
  pyServiceRunning: boolean;
  dbTablesReady: boolean;
  platform: string;
  hostname: string;
  cpus: number;
  totalMemMB: number;
}

export default function SetupWizard() {
  const [data, setData] = useState<SetupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [dbType, setDbType] = useState<"postgresql" | "mysql">("postgresql");
  const [dbHost, setDbHost] = useState("localhost");
  const [dbPort, setDbPort] = useState("5432");
  const [dbUser, setDbUser] = useState("postgres");
  const [dbPass, setDbPass] = useState("");
  const [dbCreating, setDbCreating] = useState(false);
  const [dbResult, setDbResult] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup/check");
      const d = await res.json();
      setData(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createDb = async () => {
    setDbCreating(true);
    setDbResult("Creating database...");
    try {
      const res = await fetch("/api/setup/createdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbType, host: dbHost, port: dbPort, user: dbUser, password: dbPass }),
      });
      const d = await res.json();
      setDbResult(d.ok ? "Database created! URL: " + d.dbUrl : "Error: " + (d.error || "").slice(0, 200));
    } catch (err) {
      setDbResult("Error: " + String(err));
    }
    setDbCreating(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-cyan-400 font-mono text-sm animate-pulse">Scanning system...</div></div>;
  }
  if (!data) return <div className="text-red-400 font-mono text-sm">Failed to scan</div>;

  const categories = ["core", "database", "tool", "optional"];
  const catLabels: Record<string, string> = { core: "Core", database: "Database", tool: "Tools", optional: "Optional" };
  const catIcons: Record<string, string> = { core: "Core", database: "DB", tool: "Tools", optional: "Extra" };
  const allCoreOk = data.tools.filter((t) => t.category === "core").every((t) => t.installed);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-mono font-bold text-cyan-400">RO Bot Setup Wizard</h1>
        <p className="text-[10px] font-mono text-slate-500">{data.hostname} | {data.platform} | {data.cpus} CPUs | {data.totalMemMB}MB RAM</p>
      </div>

      {/* Steps */}
      <div className="flex gap-1">
        {[{n:1,l:"Tools"},{n:2,l:"Database"},{n:3,l:"Done"}].map((s) => (
          <button key={s.n} onClick={() => setStep(s.n)}
            className={"flex-1 py-1.5 text-xs font-mono border rounded " + (step === s.n ? "border-cyan-600 text-cyan-400 bg-cyan-950/40" : s.n < step ? "border-green-800 text-green-500" : "border-slate-800 text-slate-600")}
          >{s.n < step ? "OK" : s.n}. {s.l}</button>
        ))}
      </div>

      {/* STEP 1: Tools */}
      {step === 1 && (
        <div className="space-y-3">
          {categories.map((cat) => {
            const tools = data.tools.filter((t) => t.category === cat);
            if (tools.length === 0) return null;
            return (
              <div key={cat} className="border border-slate-800 rounded bg-slate-950/80 p-3">
                <h3 className="text-xs font-mono font-bold text-slate-400 mb-2">{catLabels[cat]}</h3>
                <div className="space-y-1.5">
                  {tools.map((t) => (
                    <div key={t.key} className="flex items-center gap-2">
                      <span className={"w-2 h-2 rounded-full " + (t.installed ? "bg-green-400" : t.required ? "bg-red-400" : "bg-yellow-400")} />
                      <span className="text-[11px] font-mono text-slate-200 w-24">{t.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 flex-1 truncate">{t.installed ? (t.version || "OK").split("\n")[0] : "MISSING"}</span>
                      <span className={"text-[9px] font-mono px-1.5 py-0.5 rounded " + (t.installed ? "bg-green-900/40 text-green-400" : t.required ? "bg-red-900/40 text-red-400" : "bg-yellow-900/40 text-yellow-400")}>
                        {t.installed ? "OK" : t.required ? "REQ" : "OPT"}
                      </span>
                      {!t.installed && t.downloadUrl && (
                        <a href={t.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-mono text-cyan-500 hover:underline">DL</a>
                      )}
                    </div>
                  ))}
                </div>
                {tools.filter((t) => !t.installed && t.installCmd).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/50 space-y-1">
                    {tools.filter((t) => !t.installed && t.installCmd).map((t) => (
                      <div key={t.key} className="text-[9px] font-mono text-slate-500">
                        {t.name}: <code className="text-green-400 bg-slate-900 px-1 py-0.5 rounded text-[8px]">{t.installCmd}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Python service */}
          <div className="border border-slate-800 rounded bg-slate-950/80 p-3">
            <h3 className="text-xs font-mono font-bold text-purple-400 mb-2">Python3Service (ro_service.py)</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className={"w-2 h-2 rounded-full " + (data.pyServiceRunning ? "bg-green-400 animate-pulse" : "bg-slate-600")} />
              <span className="text-[11px] font-mono text-slate-300">{data.pyServiceRunning ? "RUNNING" : "NOT RUNNING"}</span>
            </div>
            <div className="text-[9px] font-mono text-slate-500">
              <p>Libs: requests {data.pyLibs.requests ? "OK" : "X"} | pytesseract {data.pyLibs.pytesseract ? "OK" : "X"} | Pillow {data.pyLibs.pillow ? "OK" : "X"}</p>
              {!data.pyServiceRunning && (
                <div className="mt-2 p-2 border border-slate-700 rounded bg-slate-900/50">
                  <p className="text-yellow-400 font-bold mb-1">Start:</p>
                  <code className="text-green-400 block">python3 ro_service.py</code>
                  <code className="text-green-400 block mt-1">nohup python3 ro_service.py &gt; /tmp/ro_service.log 2&gt;&1 &</code>
                </div>
              )}
            </div>
          </div>

          <button onClick={() => setStep(2)} disabled={!allCoreOk}
            className="w-full py-2 text-sm font-mono bg-cyan-900/40 border border-cyan-700 text-cyan-400 hover:bg-cyan-800/50 rounded disabled:opacity-50"
          >Next: Database</button>
        </div>
      )}

      {/* STEP 2: Database */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="border border-slate-800 rounded bg-slate-950/80 p-4">
            <h3 className="text-sm font-mono font-bold text-cyan-400 mb-3">Select Database</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(["postgresql", "mysql"] as const).map((t) => {
                const tool = data.tools.find((x) => x.key === t);
                return (
                  <button key={t} onClick={() => { setDbType(t); setDbPort(t === "mysql" ? "3306" : "5432"); setDbUser(t === "mysql" ? "root" : "postgres"); }}
                    className={"p-3 border rounded text-left " + (dbType === t ? "border-cyan-600 bg-cyan-950/30" : "border-slate-800")}
                  >
                    <p className="text-xs font-mono font-bold text-slate-200">{t === "postgresql" ? "PostgreSQL" : "MySQL"}</p>
                    <p className={"text-[10px] font-mono " + (tool?.installed ? "text-green-400" : "text-red-400")}>
                      {tool?.installed ? "Installed" : "Not installed"}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[9px] font-mono text-slate-500">Host</label>
                <input type="text" value={dbHost} onChange={(e) => setDbHost(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 px-2 py-1 rounded" />
              </div>
              <div>
                <label className="text-[9px] font-mono text-slate-500">Port</label>
                <input type="text" value={dbPort} onChange={(e) => setDbPort(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 px-2 py-1 rounded" />
              </div>
              <div>
                <label className="text-[9px] font-mono text-slate-500">User</label>
                <input type="text" value={dbUser} onChange={(e) => setDbUser(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 px-2 py-1 rounded" />
              </div>
              <div>
                <label className="text-[9px] font-mono text-slate-500">Password</label>
                <input type="password" value={dbPass} onChange={(e) => setDbPass(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 px-2 py-1 rounded" />
              </div>
            </div>
            <button onClick={createDb} disabled={dbCreating}
              className="w-full py-2 text-sm font-mono bg-green-900/40 border border-green-700 text-green-400 hover:bg-green-800/50 rounded disabled:opacity-50"
            >{dbCreating ? "Creating..." : "Create app_db"}</button>
            {dbResult && <p className={"mt-2 text-[10px] font-mono " + (dbResult.startsWith("Database created") ? "text-green-400" : "text-red-400")}>{dbResult}</p>}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded p-2">
            <p className="text-[10px] font-mono text-slate-500 mb-1">After creating DB, run in terminal:</p>
            <code className="text-green-400 text-sm font-mono">npx drizzle-kit push</code>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-2 text-xs font-mono border border-slate-700 text-slate-400 rounded">Back</button>
            <button onClick={() => setStep(3)} className="flex-1 py-2 text-xs font-mono bg-cyan-900/40 border border-cyan-700 text-cyan-400 rounded">Next</button>
          </div>
        </div>
      )}

      {/* STEP 3: Done */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="border border-cyan-800 rounded bg-cyan-950/30 p-4 text-center">
            <p className="text-3xl mb-2">OK</p>
            <h3 className="text-lg font-mono font-bold text-cyan-400">Setup Complete!</h3>
          </div>
          <div className="border border-slate-800 rounded bg-slate-950/80 p-3 space-y-2">
            <h3 className="text-xs font-mono font-bold text-slate-400">Quick Start</h3>
            <div className="space-y-1 text-[10px] font-mono">
              <p className="text-slate-500">Server:</p>
              <code className="text-green-400 bg-slate-900 px-2 py-0.5 rounded block">npm run start</code>
              <p className="text-slate-500 mt-2">Python service:</p>
              <code className="text-green-400 bg-slate-900 px-2 py-0.5 rounded block">python3 ro_service.py</code>
              <p className="text-slate-500 mt-2">ADB connect:</p>
              <code className="text-green-400 bg-slate-900 px-2 py-0.5 rounded block">adb connect IP:5555</code>
            </div>
          </div>
          <a href="/" className="block w-full py-2 text-center text-sm font-mono bg-cyan-600 border border-cyan-500 text-white hover:bg-cyan-500 rounded">Open Dashboard</a>
        </div>
      )}

      <button onClick={refresh} className="w-full py-1 text-[10px] font-mono border border-slate-800 text-slate-500 hover:text-slate-300 rounded">Refresh</button>
    </div>
  );
}
