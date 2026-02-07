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
}

const activeLocks = new Map<string, ActiveLock>();
const ASSET_IMAGE_URL = "https://raw.githubusercontent.com/replit/agent-assets/main/pickel.png"; // Placeholder
const LOCAL_IMAGE_URL = "/images/pickel.png"; 

export async function startBot() {
  if (!process.env.DISCORD_TOKEN) return;

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

    // Admin commands
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
          await applyLock(message.channel as TextChannel, config.targetUserId, false);
          await message.reply("🔒 Locked.");
        } else if (cmd === "purge") {
          const num = parseInt(args[1]);
          if (!isNaN(num)) await (message.channel as TextChannel).bulkDelete(Math.min(num, 100));
        }
      }
    }

    // Only react to specific bot
    if (message.author.id !== config.sourceBotId) return;

    const hasRarePing = message.mentions.roles.has(config.detectionRoleId);
    const isShinyHunt = message.content.includes("Shiny hunt pings:");

    if (isShinyHunt || hasRarePing) {
      // Shiny takes priority for logic, but lock is the same
      await applyLock(message.channel as TextChannel, config.targetUserId, isShinyHunt, message.mentions.users.first()?.id);
    }
  });

  async function applyLock(channel: TextChannel, targetUserId: string, isShinyHunt: boolean, hunterId?: string) {
    try {
      await channel.permissionOverwrites.edit(targetUserId, {
        ViewChannel: false,
        SendMessages: false,
        AddReactions: false,
        UseExternalEmojis: false,
        ReadMessageHistory: false,
      });

      activeLocks.set(channel.id, { hunterId, channelId: channel.id, lockedAt: new Date(), isShinyHunt });

      const embed = new EmbedBuilder()
        .setTitle(isShinyHunt ? "✨ Shiny Hunt: Channel is locked" : "🔒 Rare Spawn: Channel is locked")
        .setDescription(isShinyHunt 
          ? `Only <@${hunterId}> or Admins can unlock.` 
          : "Anyone can unlock this channel.")
        .setImage(ASSET_IMAGE_URL) // Use the GitHub URL as it's more reliable for Discord
        .setThumbnail("https://raw.githubusercontent.com/replit/agent-assets/main/pickel.png")
        .setColor(isShinyHunt ? 0xFFA500 : 0xFF0000);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("unlock_button").setLabel("Locked").setStyle(ButtonStyle.Danger)
      );

      await channel.send({ embeds: [embed], components: [row] });
      await storage.addLog({ type: "LOCK", message: `Locked for ${isShinyHunt ? 'Shiny' : 'Rare'}.`, channelName: channel.name });
    } catch (e) {
      console.error(e);
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
        ViewChannel: null,
        SendMessages: null,
        AddReactions: null,
        UseExternalEmojis: null,
        ReadMessageHistory: null,
      });
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
      console.error(e);
      if (source.reply) source.reply({ content: "Failed to unlock. Check permissions.", ephemeral: true }).catch(() => {});
    }
  }

  client.login(process.env.DISCORD_TOKEN).catch(console.error);
}
