import { db } from "./db";
import { botConfigs, logs, warnings, reports, type BotConfig, type InsertBotConfig, type Log, type InsertLog, type Warning, type InsertWarning, type Report, type InsertReport } from "@shared/schema";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  getConfig(): Promise<BotConfig | undefined>;
  updateConfig(config: InsertBotConfig): Promise<BotConfig>;
  getLogs(limit?: number): Promise<Log[]>;
  addLog(log: InsertLog): Promise<Log>;
  addWarning(warning: InsertWarning): Promise<Warning>;
  getUserWarnings(userId: string, guildId: string): Promise<Warning[]>;
  addReport(report: InsertReport): Promise<Report>;
  getReports(guildId: string): Promise<Report[]>;
}

export class DatabaseStorage implements IStorage {
  async getConfig(): Promise<BotConfig | undefined> {
    const [config] = await db.select().from(botConfigs).limit(1);
    return config;
  }
  async updateConfig(insertConfig: InsertBotConfig): Promise<BotConfig> {
    const [existing] = await db.select().from(botConfigs).limit(1);
    if (existing) {
      const [updated] = await db.update(botConfigs).set(insertConfig).where(eq(botConfigs.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(botConfigs).values(insertConfig).returning();
    return created;
  }
  async getLogs(limit = 50): Promise<Log[]> {
    return await db.select().from(logs).orderBy(desc(logs.timestamp)).limit(limit);
  }
  async addLog(log: InsertLog): Promise<Log> {
    const [created] = await db.insert(logs).values(log).returning();
    return created;
  }
  async addWarning(warning: InsertWarning): Promise<Warning> {
    const [created] = await db.insert(warnings).values(warning).returning();
    return created;
  }
  async getUserWarnings(userId: string, guildId: string): Promise<Warning[]> {
    return await db.select().from(warnings).where(and(eq(warnings.userId, userId), eq(warnings.guildId, guildId)));
  }
  async addReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }
  async getReports(guildId: string): Promise<Report[]> {
    return await db.select().from(reports).where(eq(reports.guildId, guildId)).orderBy(desc(reports.timestamp));
  }
}

export const storage = new DatabaseStorage();
