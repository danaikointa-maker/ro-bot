import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  name: text("name").notNull().default("Unknown"),
  status: text("status").notNull().default("disconnected"),
  model: text("model").default(""),
  androidVersion: text("android_version").default(""),
  screenW: integer("screen_w").default(1080),
  screenH: integer("screen_h").default(2400),
  connectionType: text("connection_type").default("adb"), // adb, network, apk
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  connectedAt: timestamp("connected_at"),
});

export const gameState = pgTable("game_state", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  hp: integer("hp").default(0),
  maxHp: integer("max_hp").default(0),
  sp: integer("sp").default(0),
  maxSp: integer("max_sp").default(0),
  level: integer("level").default(0),
  baseLevel: integer("base_level").default(0),
  jobLevel: integer("job_level").default(0),
  zeny: integer("zeny").default(0),
  posX: integer("pos_x").default(0),
  posY: integer("pos_y").default(0),
  mapName: text("map_name").default(""),
  jobName: text("job_name").default(""),
  guildName: text("guild_name").default(""),
  partyName: text("party_name").default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const botMacros = pgTable("bot_macros", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // farm, pvp, support, heal, custom
  config: jsonb("config").notNull().default({}),
  active: boolean("active").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const waypoints = pgTable("waypoints", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  mapName: text("map_name").default(""),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  label: text("label").default(""),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatLog = pgTable("chat_log", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  channel: text("channel").default("general"), // general, party, guild, system, pm
  sender: text("sender").default(""),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export { notifications } from "./notifications";

export const adbCommands = pgTable("adb_commands", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  command: text("command").notNull(),
  output: text("output").default(""),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
