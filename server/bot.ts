import { Client, GatewayIntentBits, TextChannel, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { storage } from "./storage";

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

interface ActiveLock {
  hunterId?: string;
  channelId: string;
  lockedAt: Date;
  isShinyHunt: boolean;
  reminderSent?: boolean;
}

const activeLocks = new Map<string, ActiveLock>();
const ASSET_IMAGE_URL = "https://raw.githubusercontent.com/replit/agent-assets/main/pickel.png";

export async function startBot() {
  if (!process.env.DISCORD_TOKEN) return;

  // Auto-unlock and Reminder Timers
  setInterval(async () => {
    const now = new Date();
    const locks = Array.from(activeLocks.entries());
    for (const [channelId, lock] of locks) {
      const diffMs = now.getTime() - lock.lockedAt.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);

      const channel = client.channels.cache.get(channelId) as TextChannel;
      if (!channel) {
        activeLocks.delete(channelId);
        continue;
      }

      // 6 Hour Shiny Reminder
      if (lock.isShinyHunt && diffHrs >= 6 && !lock.reminderSent) {
        lock.reminderSent = true;
        if (lock.hunterId) {
          await channel.send(`✨ **Reminder ping:** <@${lock.hunterId}>, this channel is still locked for your shiny hunt!`).catch(console.error);
        }
      }

      // 12 Hour Auto-Unlock
      if (diffHrs >= 12) {
        try {
          const config = await storage.getConfig();
          if (config) {
            await channel.permissionOverwrites.edit(config.targetUserId, {
              ViewChannel: true,
              SendMessages: true,
              AddReactions: true,
              UseExternalEmojis: true,
              ReadMessageHistory: true,
            }, { reason: "Auto-unlock after 12h", type: 1 });
            activeLocks.delete(channelId);
            await channel.send("🔓 **Auto-unlock:** This channel has been automatically unlocked after 12 hours.").catch(console.error);
            await storage.addLog({ type: "UNLOCK", message: "Auto-unlocked after 12h", channelName: channel.name });
          }
        } catch (e) {
          console.error("Auto-unlock failed:", e);
        }
      }
    }
  }, 1000 * 60 * 5); // Check every 5 minutes

  client.on("ready", () => {
    storage.addLog({ type: "INFO", message: `Bot online as ${client.user?.tag}`, channelName: "System" });
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === "unlock_button") {
      await handleUnlock(interaction as any);
    }
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot && message.author.id === client.user?.id) return;

    const config = await storage.getConfig();
    if (!config || !config.isSystemEnabled) return;

    // Command handling
    if (message.content.startsWith(".")) {
      const args = message.content.slice(1).trim().split(/\s+/);
      const cmd = args[0].toLowerCase();
      const isAdmin = config.adminRoleId ? message.member?.roles.cache.has(config.adminRoleId) : message.member?.permissions.has(PermissionsBitField.Flags.Administrator);

      if (cmd === "unlock" || cmd === "ul") {
        await handleUnlock(message);
        return;
      }

      if (isAdmin) {
        if (cmd === "lock") {
          await applyLock(message.channel as TextChannel, config.targetUserId, 'mod');
          return;
        } else if (cmd === "purge") {
          const num = parseInt(args[1]);
          if (!isNaN(num)) await (message.channel as TextChannel).bulkDelete(Math.min(num, 100));
        }
      }
    }

    // Spawn Detection
    if (message.author.id !== config.sourceBotId) return;

    const isShinyHunt = message.content.includes("Shiny hunt pings:");
    const isRareSpawn = message.mentions.roles.has(config.detectionRoleId);
    const isRegionalSpawn = config.regionalRoleId ? message.mentions.roles.has(config.regionalRoleId) : false;

    if (isShinyHunt || isRareSpawn || isRegionalSpawn) {
      let hunterId: string | undefined;
      let lockType: 'shiny' | 'rare' | 'regional';

      // Prioritize shiny hunt, then regional, then rare to prevent double embeds
      if (isShinyHunt) {
        lockType = 'shiny';
        const lines = message.content.split("\n");
        const shinyLine = lines.find(l => l.includes("Shiny hunt pings:"));
        if (shinyLine) {
          const match = shinyLine.match(/<@!?(\d+)>/);
          if (match) hunterId = match[1];
        }
      } else if (isRegionalSpawn) {
        lockType = 'regional';
      } else {
        lockType = 'rare';
      }

      await applyLock(message.channel as TextChannel, config.targetUserId, lockType, hunterId);
    }
  });

  async function applyLock(channel: TextChannel, targetUserId: string, type: 'shiny' | 'rare' | 'regional' | 'mod', hunterId?: string) {
    try {
      await channel.permissionOverwrites.edit(targetUserId, {
        ViewChannel: false,
        SendMessages: false,
        AddReactions: false,
        UseExternalEmojis: false,
        ReadMessageHistory: false,
        EmbedLinks: false,
        AttachFiles: false,
      }, { reason: "Bot Lock", type: 1 });

      const isShiny = type === 'shiny';
      activeLocks.set(channel.id, { hunterId, channelId: channel.id, lockedAt: new Date(), isShinyHunt: isShiny });

      let title = "🔒 Channel Locked";
      let description = "This channel has been locked.";
      let color = 0xFF0000;

      if (type === 'shiny') {
        title = "✨ Shiny Hunt Locked";
        description = `Only <@${hunterId}> or Admins can unlock.\n\n**How to unlock:**\nClick the button below or use \`.ul\``;
        color = 0xFFA500;
      } else if (type === 'rare') {
        title = "🔒 Rare Spawn Locked";
        description = "Anyone can unlock this channel.\n\n**How to unlock:**\nClick the button below or use \`.ul\`";
      } else if (type === 'regional') {
        title = "🌏 Regional Spawn Locked";
        description = "Anyone can unlock this channel.\n\n**How to unlock:**\nClick the button below or use \`.ul\`";
      } else if (type === 'mod') {
        title = "👮 Moderation Lock";
        description = "This channel was locked by a moderator.";
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setImage(ASSET_IMAGE_URL + "?t=" + Date.now())
        .setThumbnail(ASSET_IMAGE_URL)
        .setColor(color)
        .setFooter({ text: "ShinyHunt Manager • Pickel", iconURL: ASSET_IMAGE_URL });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("unlock_button").setLabel("Unlock Channel").setStyle(ButtonStyle.Success)
      );

      await channel.send({ embeds: [embed], components: [row] });
      await storage.addLog({ type: "LOCK", message: `Locked for ${type}. Hunter: ${hunterId || 'None'}`, channelName: channel.name });
    } catch (e) {
      console.error("Lock failed:", e);
    }
  }

  async function handleUnlock(source: any) {
    const channel = source.channel as TextChannel;
    const user = source.user || source.author;
    const config = await storage.getConfig();
    if (!config) return;

    const lock = activeLocks.get(channel.id);
    const member = source.member;
    const isAdmin = config.adminRoleId ? member?.roles.cache.has(config.adminRoleId) : member?.permissions.has(PermissionsBitField.Flags.Administrator);
    const isHunter = lock?.hunterId === user.id;

    if (lock?.isShinyHunt) {
      if (!isAdmin && !isHunter) {
        const msg = "❌ Only the pinged hunter can unlock this channel.";
        if (source.reply) {
          return source.reply({ content: msg, ephemeral: true });
        } else {
          return channel.send(msg);
        }
      }
    }

    try {
      await channel.permissionOverwrites.edit(config.targetUserId, {
        ViewChannel: true,
        SendMessages: true,
        AddReactions: true,
        UseExternalEmojis: true,
        ReadMessageHistory: true,
        EmbedLinks: true,
        AttachFiles: true,
      }, { reason: "Bot Unlock", type: 1 });
      activeLocks.delete(channel.id);
      
      const msg = "🔓 Channel Unlocked. Permissions restored.";
      if (source.reply) {
        if (source.deferred || source.replied) {
          await source.followUp({ content: msg });
        } else {
          await source.reply({ content: msg });
        }
      } else {
        await channel.send(msg);
      }

      await storage.addLog({ type: "UNLOCK", message: `Unlocked by ${user.tag}`, channelName: channel.name });
    } catch (e) {
      console.error("Unlock failed:", e);
      if (source.reply) source.reply({ content: "Failed to unlock. Check permissions.", ephemeral: true }).catch(() => {});
    }
  }

  client.login(process.env.DISCORD_TOKEN).catch(console.error);
}
async function main() {
  if (!process.env.DISCORD_TOKEN) {
    console.error("❌ DISCORD_TOKEN is not set");
    process.exit(1);
  }

  await client.login(process.env.DISCORD_TOKEN);
  await startBot();
}

main().catch(console.error);