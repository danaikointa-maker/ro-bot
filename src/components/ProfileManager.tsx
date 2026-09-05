"use client";

import React, { useState, useEffect } from "react";

const STORAGE_KEY = "ro_bot_profiles";

interface Profile {
  id: string;
  name: string;
  jobName: string;
  botConfig: Record<string, any>;
  waypoints: string[];
  created: string;
}

export default function ProfileManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) setProfiles(JSON.parse(data));
    } catch {}
  }, []);

  const saveToStorage = (list: Profile[]) => {
    setProfiles(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  const saveProfile = () => {
    if (!name.trim()) return;
    const newProfile: Profile = {
      id: Date.now().toString(),
      name: name.trim(),
      jobName: "Swordsman",
      botConfig: { autoAttack: true, autoPot: true, autoBuff: false },
      waypoints: [],
      created: new Date().toISOString(),
    };
    saveToStorage([...profiles, newProfile]);
    setName("");
  };

  const deleteProfile = (id: string) => {
    saveToStorage(profiles.filter((p) => p.id !== id));
    if (selected === id) setSelected("");
  };

  const loadProfile = (id: string) => {
    setSelected(id);
    const p = profiles.find((prof) => prof.id === id);
    if (p) {
      // Dispatch event for Dashboard to read
      window.dispatchEvent(new CustomEvent("ro-profile-load", { detail: p }));
    }
  };

  return (
    <div className="border border-slate-800 rounded bg-slate-950/80 p-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-mono font-bold text-cyan-400">Profiles</h3>
        <span className="text-[9px] font-mono text-slate-600">{profiles.length} saved</span>
      </div>

      {/* Save */}
      <div className="flex gap-1 mb-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Profile name (e.g., Knight Farm)"
          className="flex-1 bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 px-2 py-1 rounded placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
          onKeyDown={(e) => { if (e.key === "Enter") saveProfile(); }}
        />
        <button onClick={saveProfile} className="px-2 py-1 text-xs font-mono bg-cyan-900/40 border border-cyan-700 text-cyan-400 hover:bg-cyan-800/50 rounded">SAVE</button>
      </div>

      {/* List */}
      <div className="max-h-36 overflow-auto space-y-1">
        {profiles.length === 0 ? (
          <p className="text-[10px] font-mono text-slate-600 text-center py-2">No profiles saved</p>
        ) : (
          profiles.map((p) => (
            <div
              key={p.id}
              onClick={() => loadProfile(p.id)}
              className={`flex items-center gap-2 px-2 py-1 border rounded cursor-pointer transition-colors text-[10px] font-mono ${
                selected === p.id ? "border-cyan-600 bg-cyan-950/30 text-cyan-300" : "border-slate-800 hover:border-slate-600 text-slate-400"
              }`}
            >
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-[9px] text-slate-500">{p.jobName}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }} className="text-red-400 hover:text-red-300 text-[10px]">x</button>
            </div>
          ))
        )}
      </div>

      <p className="text-[9px] font-mono text-slate-600 mt-1">Saves bot config + waypoints per profile</p>
    </div>
  );
}
