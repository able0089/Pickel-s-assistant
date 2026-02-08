import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const botConfigs = pgTable("bot_configs", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  targetUserId: text("target_user_id").notNull(), // Specific user to lock
  detectionRoleId: text("detection_role_id").notNull(), // Rare role ID
  regionalRoleId: text("regional_role_id"), // Regional role ID
  sourceBotId: text("source_bot_id").notNull(), // ID of the bot to listen to (e.g. p2a ap)
  adminRoleId: text("admin_role_id"),
  isSystemEnabled: boolean("is_system_enabled").default(true),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
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
