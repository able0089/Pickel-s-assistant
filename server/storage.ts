import { db } from "./db";
import {
  botConfigs,
  logs,
  type BotConfig,
  type InsertBotConfig,
  type Log,
  type InsertLog,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getConfig(): Promise<BotConfig | undefined>;
  updateConfig(config: InsertBotConfig): Promise<BotConfig>;
  getLogs(limit?: number): Promise<Log[]>;
  addLog(log: InsertLog): Promise<Log>;
}

export class DatabaseStorage implements IStorage {
  async getConfig(): Promise<BotConfig | undefined> {
    const [config] = await db.select().from(botConfigs).limit(1);
    return config;
  }

  async updateConfig(insertConfig: InsertBotConfig): Promise<BotConfig> {
    const [existing] = await db.select().from(botConfigs).limit(1);
    if (existing) {
      const [updated] = await db
        .update(botConfigs)
        .set(insertConfig)
        .where(eq(botConfigs.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(botConfigs).values(insertConfig).returning();
      return created;
    }
  }

  async getLogs(limit = 50): Promise<Log[]> {
    return await db.select().from(logs).orderBy(desc(logs.timestamp)).limit(limit);
  }

  async addLog(log: InsertLog): Promise<Log> {
    const [created] = await db.insert(logs).values(log).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
