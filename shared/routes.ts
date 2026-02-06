import { z } from "zod";
import { insertBotConfigSchema, botConfigs, logs } from "./schema";

export const api = {
  config: {
    get: {
      method: "GET" as const,
      path: "/api/config",
      responses: {
        200: z.array(z.custom<typeof botConfigs.$inferSelect>()),
      },
    },
    update: {
      method: "POST" as const,
      path: "/api/config",
      input: insertBotConfigSchema,
      responses: {
        200: z.custom<typeof botConfigs.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
  },
  logs: {
    list: {
      method: "GET" as const,
      path: "/api/logs",
      responses: {
        200: z.array(z.custom<typeof logs.$inferSelect>()),
      },
    },
  },
  status: {
    get: {
      method: "GET" as const,
      path: "/api/status",
      responses: {
        200: z.object({
          online: z.boolean(),
          uptime: z.number(),
          lastPing: z.string().optional(),
        }),
      },
    },
  },
};
