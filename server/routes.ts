import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { startBot, client } from "./bot";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Start the bot
  startBot().catch(console.error);

  // API Routes
  app.get(api.status.get.path, (_req, res) => {
    res.json({
      online: client.isReady(),
      uptime: client.uptime || 0,
      lastPing: new Date().toISOString(),
    });
  });

  app.get(api.config.get.path, async (_req, res) => {
    const config = await storage.getConfig();
    res.json(config ? [config] : []);
  });

  app.post(api.config.update.path, async (req, res) => {
    try {
      const input = api.config.update.input.parse(req.body);
      const updated = await storage.updateConfig(input);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get(api.logs.list.path, async (_req, res) => {
    const logs = await storage.getLogs();
    res.json(logs);
  });

  // Seed default config if missing
  const existingConfig = await storage.getConfig();
  if (!existingConfig) {
    await storage.updateConfig({
      guildId: "REPLACE_WITH_GUILD_ID",
      targetUserId: "REPLACE_WITH_TARGET_USER_ID",
      detectionRoleId: "REPLACE_WITH_DETECTION_ROLE_ID",
      sourceBotId: "REPLACE_WITH_BOT_ID",
      isSystemEnabled: true,
    });
    console.log("Seeded default bot configuration");
  }

  return httpServer;
}
