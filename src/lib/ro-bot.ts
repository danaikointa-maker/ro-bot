// RO Bot Engine - Core logic for controlling Ragnarok: The New World
// Package: com.ggv.roworldsea.aos

export const RO_PACKAGE = "com.ggv.roworldsea.aos";
export const RO_ACTIVITY = "com.unity3d.player.UnityPlayerActivity";

export interface RoGameState {
  hp: number; maxHp: number;
  sp: number; maxSp: number;
  baseLevel: number; jobLevel: number;
  zeny: number;
  posX: number; posY: number;
  mapName: string; jobName: string;
  guildName: string; partyName: string;
  isAlive: boolean;
  inCombat: boolean;
  targetName: string;
  targetHp: number; targetMaxHp: number;
}

export interface BotConfig {
  autoAttack: boolean;
  autoSkill: boolean;
  autoPot: boolean;
  autoLoot: boolean;
  autoBuff: boolean;
  autoHealParty: boolean;
  autoFarm: boolean;
  antiAfk: boolean;
  hpPotThreshold: number;
  spPotThreshold: number;
  hpEmergencyThreshold: number;
  attackBtn: { x: number; y: number };
  skillSlots: { x: number; y: number }[];
  potBtn: { x: number; y: number };
  emergencyPotBtn: { x: number; y: number };
  autoBtn: { x: number; y: number };
  lootBtn: { x: number; y: number };
  farmRadius: number;
  farmMap: string;
  farmTargets: string[];
  attackSkill: number;
  buffSkills: number[];
  healSkill: number;
  aoeSkill: number;
  attackInterval: number;
  skillInterval: number;
  potCheckInterval: number;
}

export const DEFAULT_BOT_CONFIG: BotConfig = {
  autoAttack: false, autoSkill: false, autoPot: false,
  autoLoot: false, autoBuff: false, autoHealParty: false,
  autoFarm: false, antiAfk: true,
  hpPotThreshold: 60, spPotThreshold: 40, hpEmergencyThreshold: 30,
  attackBtn: { x: 900, y: 2100 },
  skillSlots: [
    { x: 660, y: 2100 }, { x: 720, y: 2100 }, { x: 780, y: 2100 },
    { x: 840, y: 2100 }, { x: 900, y: 2100 }, { x: 660, y: 2160 },
    { x: 720, y: 2160 }, { x: 780, y: 2160 }, { x: 840, y: 2160 },
  ],
  potBtn: { x: 540, y: 2250 },
  emergencyPotBtn: { x: 480, y: 2250 },
  autoBtn: { x: 960, y: 2100 },
  lootBtn: { x: 600, y: 2250 },
  farmRadius: 5, farmMap: "", farmTargets: [],
  attackSkill: 1, buffSkills: [], healSkill: 2, aoeSkill: 3,
  attackInterval: 800, skillInterval: 1500, potCheckInterval: 1000,
};

export const RO_JOBS: Record<string, { name: string; skills: string[] }> = {
  swordsman: { name: "Swordsman", skills: ["Bash", "Provoke", "Magnum Break", "Endure"] },
  knight: { name: "Knight", skills: ["Bowling Bash", "Pierce", "Spear Boomerang", "Brandish Spear"] },
  assassin: { name: "Assassin", skills: ["Sonic Blow", "Grimtooth", "Enchant Poison", "Meteor Assault"] },
  hunter: { name: "Hunter", skills: ["Double Strafe", "Arrow Shower", "Charge Arrow", "Sharp Shooting"] },
  wizard: { name: "Wizard", skills: ["Fire Bolt", "Cold Bolt", "Meteor Storm", "Storm Gust", "Lord of Vermilion"] },
  priest: { name: "Priest", skills: ["Heal", "Blessing", "Increase AGI", "Kyrie Eleison", "Magnificat", "Resurrection"] },
  blacksmith: { name: "Blacksmith", skills: ["Cart Revolution", "Mammonite", "Power Maximize", "Adrenaline Rush"] },
  crusader: { name: "Crusader", skills: ["Holy Cross", "Grand Cross", "Shield Charge", "Sacrifice", "Devotion"] },
  rogue: { name: "Rogue", skills: ["Backstab", "Strip Weapon", "Plagiarism", "Intimidate"] },
  druid: { name: "Druid", skills: ["Nature Blessing", "Wild Shape: Bear", "Wild Shape: Eagle", "Entangle"] },
};

export interface Waypoint {
  id: string; x: number; y: number; mapName: string; label: string;
  action?: string; actionParam?: string; waitMs?: number;
}

export interface PartyMember {
  name: string; hp: number; maxHp: number; sp: number; maxSp: number;
  jobName: string; isLeader: boolean; posX: number; posY: number;
}

export interface ChatMessage {
  channel: string; sender: string; message: string; timestamp: number;
}

export type BotAction =
  | { type: "tap"; x: number; y: number }
  | { type: "swipe"; x1: number; y1: number; x2: number; y2: number; duration: number }
  | { type: "keyevent"; keycode: number }
  | { type: "text"; text: string }
  | { type: "screenshot" }
  | { type: "wait"; ms: number }
  | { type: "shell"; command: string };

export function generateAttackSequence(config: BotConfig): BotAction[] {
  const actions: BotAction[] = [];
  if (config.autoSkill && config.attackSkill > 0) {
    const slot = config.skillSlots[config.attackSkill - 1];
    if (slot) actions.push({ type: "tap", x: slot.x, y: slot.y });
  }
  actions.push({ type: "tap", x: config.attackBtn.x, y: config.attackBtn.y });
  if (config.autoLoot) {
    actions.push({ type: "tap", x: config.lootBtn.x, y: config.lootBtn.y });
  }
  return actions;
}

export function generateBuffSequence(config: BotConfig): BotAction[] {
  const actions: BotAction[] = [];
  for (const skillIdx of config.buffSkills) {
    const slot = config.skillSlots[skillIdx - 1];
    if (slot) {
      actions.push({ type: "tap", x: slot.x, y: slot.y });
      actions.push({ type: "wait", ms: 2000 });
    }
  }
  return actions;
}

export function generatePotAction(state: RoGameState, config: BotConfig): BotAction | null {
  if (state.maxHp === 0) return null;
  const hpPct = (state.hp / state.maxHp) * 100;
  const spPct = state.maxSp > 0 ? (state.sp / state.maxSp) * 100 : 100;
  if (hpPct < config.hpEmergencyThreshold) {
    return { type: "tap", x: config.emergencyPotBtn.x, y: config.emergencyPotBtn.y };
  }
  if (hpPct < config.hpPotThreshold) {
    return { type: "tap", x: config.potBtn.x, y: config.potBtn.y };
  }
  if (spPct < config.spPotThreshold) {
    return { type: "tap", x: config.potBtn.x, y: config.potBtn.y };
  }
  return null;
}

export function generateWalkAction(fromX: number, fromY: number, to: Waypoint): BotAction {
  const dx = to.x - fromX;
  const dy = to.y - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { type: "wait", ms: 100 };
  const duration = Math.min(3000, dist * 100);
  const joyCX = 200, joyCY = 1500, maxR = 100;
  const ndx = (dx / dist) * maxR;
  const ndy = (dy / dist) * maxR;
  return { type: "swipe", x1: joyCX, y1: joyCY, x2: joyCX + ndx, y2: joyCY + ndy, duration };
}
