import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const botConfigs = pgTable("bot_configs", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(), // Limits bot to specific guilds or just stores settings per guild
  targetRoleId: text("target_role_id").notNull(), // Role to lock (remove perms from)
  detectionRoleId: text("detection_role_id").notNull(), // Role pinged by the P2A bot
  adminRoleId: text("admin_role_id"), // Role allowed to override locks
  spawnChannelId: text("spawn_channel_id"), // Optional: limit to specific channel
  isSystemEnabled: boolean("is_system_enabled").default(true),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'LOCK', 'UNLOCK', 'INFO', 'ERROR'
  message: text("message").notNull(),
  channelName: text("channel_name"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertBotConfigSchema = createInsertSchema(botConfigs).omit({ id: true });
export const insertLogSchema = createInsertSchema(logs).omit({ id: true, timestamp: true });

export type BotConfig = typeof botConfigs.$inferSelect;
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
