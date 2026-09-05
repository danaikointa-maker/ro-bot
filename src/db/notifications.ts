import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  type: text("type").notNull(), // low_hp, loot, disconnected, comeback, complete
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull().default("info"), // critical, warning, info, success
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
});
