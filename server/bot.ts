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
const afkUsers = new Map<string, { reason: string, timestamp: Date }>();
const ASSET_IMAGE_URL = "https://raw.githubusercontent.com/replit/agent-assets/main/pickel.png";
const OWNER_ID = "1396815034247806999";
const TOKEN = process.env.DISCORD_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

function parseTime(str: string): number | null {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 1000 * 60;
    case 'h': return val * 1000 * 60 * 60;
    case 'd': return val * 1000 * 60 * 60 * 24;
    default: return null;
  }
}

export async function startBot() {
  if (!TOKEN) {
    console.warn("DISCORD_TOKEN not found. Bot will not start.");
    return;
  }
  if (!DATABASE_URL) {
    console.warn("DATABASE_URL not found. Database operations will fail.");
  }

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

      if (lock.isShinyHunt && diffHrs >= 6 && !lock.reminderSent) {
        lock.reminderSent = true;
        if (lock.hunterId) {
          await channel.send(`✨ **Reminder ping:** <@${lock.hunterId}>, this channel is still locked for your shiny hunt!`).catch(console.error);
        }
      }

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
              EmbedLinks: true,
              AttachFiles: true,
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
  }, 1000 * 60 * 5);

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
    if (message.author.bot) return;

    if (afkUsers.has(message.author.id)) {
      afkUsers.delete(message.author.id);
      message.reply("Welcome back! I've removed your AFK status.").then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    }

    message.mentions.users.forEach(user => {
      const afkData = afkUsers.get(user.id);
      if (afkData) {
        message.reply(`**${user.username}** is currently AFK: ${afkData.reason} (since <t:${Math.floor(afkData.timestamp.getTime() / 1000)}:R>)`);
      }
    });

    const config = await storage.getConfig();
    if (!config || !config.isSystemEnabled) return;

    if (message.content.startsWith(".")) {
      const args = message.content.slice(1).trim().split(/\s+/);
      const cmd = args[0].toLowerCase();
      const isAdmin = config.adminRoleId ? message.member?.roles.cache.has(config.adminRoleId) : message.member?.permissions.has(PermissionsBitField.Flags.Administrator);

      if (cmd === "unlock" || cmd === "ul") {
        await handleUnlock(message);
        return;
      }

      if (cmd === "help") {
        const helpEmbed = new EmbedBuilder()
          .setAuthor({ name: "ShinyHunt Manager Help", iconURL: ASSET_IMAGE_URL })
          .setTitle("🤖 Bot Commands & Information")
          .setDescription(`Welcome! I am managed by <@${OWNER_ID}>.\nHere are the commands you can use:`)
          .addFields(
            { name: "🛠️ Management", value: "`.ul` / `.unlock` - Unlock channel\n`.lock` - Mod lock\n`.purge <n>` - Delete messages" },
            { name: "🛡️ Moderation", value: "`.warn <@user> [reason]` - Warn user (2=mute, 5=ban)\n`.ban <@user> [reason]` - Ban user\n`.reports` - View reports" },
            { name: "⏰ Utilities", value: "`.remind <time> <reason>` - Set reminder\n`.afk [reason]` - Set AFK status\n`.report <@user> <reason>` - Report user\n`.ping` - Latency\n`.avatar [@user]` - Show avatar" },
            { name: "🎮 Fun", value: "`.roll [max]` - Roll a number\n`.coinflip` - Flip a coin\n`.rps [choice]` - Rock Paper Scissors" },
            { name: "✨ Automation", value: "I automatically lock channels for **Rare**, **Regional**, and **Shiny** spawns." }
          )
          .setThumbnail(ASSET_IMAGE_URL)
          .setColor(0x5865F2)
          .setFooter({ text: "Pickel • Your Spawn Companion", iconURL: ASSET_IMAGE_URL });
        
        return message.reply({ embeds: [helpEmbed] });
      }

      if (cmd === "afk") {
        const reason = args.slice(1).join(" ") || "AFK";
        afkUsers.set(message.author.id, { reason, timestamp: new Date() });
        return message.reply(`✅ I've set your AFK: **${reason}**`);
      }

      if (cmd === "report") {
        const targetUser = message.mentions.users.first();
        const reason = args.slice(2).join(" ");
        if (!targetUser || !reason) return message.reply("Usage: .report <@user> <reason>");
        
        await storage.addReport({
          userId: targetUser.id,
          guildId: message.guildId!,
          reason: reason,
          reportedBy: message.author.id,
        });
        return message.reply("✅ Report submitted to admins.");
      }

      if (cmd === "ping") {
        return message.reply(`🏓 Pong! Latency: **${client.ws.ping}ms**`);
      }

      if (cmd === "avatar") {
        const target = message.mentions.users.first() || message.author;
        const avatarEmbed = new EmbedBuilder()
          .setTitle(`${target.username}'s Avatar`)
          .setImage(target.displayAvatarURL({ size: 1024 }))
          .setColor(0x5865F2);
        return message.reply({ embeds: [avatarEmbed] });
      }

      if (cmd === "remind") {
        const timeStr = args[1];
        const reason = args.slice(2).join(" ") || "No reason provided";
        if (!timeStr) return message.reply("Usage: .remind <time> [reason]");
        
        const ms = parseTime(timeStr);
        if (!ms) return message.reply("Invalid time format!");

        await message.reply(`✅ I'll remind you in **${timeStr}** for: *${reason}*`);
        
        setTimeout(async () => {
          await message.channel.send(`🔔 <@${message.author.id}>, reminder ${timeStr} ago: **${reason}**`).catch(console.error);
        }, ms);
        return;
      }

      if (cmd === "roll") {
        const max = parseInt(args[1]) || 100;
        const result = Math.floor(Math.random() * max) + 1;
        return message.reply(`🎲 You rolled a **${result}** (1-${max})`);
      }

      if (cmd === "coinflip") {
        const result = Math.random() > 0.5 ? "Heads" : "Tails";
        return message.reply(`🪙 It's **${result}**!`);
      }

      if (cmd === "rps") {
        const choices = ["rock", "paper", "scissors"];
        const userChoice = args[1]?.toLowerCase();
        if (!choices.includes(userChoice)) return message.reply("Usage: .rps [rock/paper/scissors]");
        
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        let result = "";
        if (userChoice === botChoice) result = "It's a tie!";
        else if (
          (userChoice === "rock" && botChoice === "scissors") ||
          (userChoice === "paper" && botChoice === "rock") ||
          (userChoice === "scissors" && botChoice === "paper")
        ) result = "You win!";
        else result = "I win!";
        
        return message.reply(`${userChoice} vs ${botChoice}... **${result}**`);
      }

      if (isAdmin) {
        if (cmd === "warn") {
          const targetUser = message.mentions.users.first();
          const reason = args.slice(2).join(" ") || "No reason provided";
          if (!targetUser) return message.reply("Usage: .warn <@user> [reason]");
          
          await storage.addWarning({
            userId: targetUser.id,
            guildId: message.guildId!,
            reason: reason,
            warnedBy: message.author.id,
          });
          
          const userWarnings = await storage.getUserWarnings(targetUser.id, message.guildId!);
          const warnCount = userWarnings.length;
          
          let actionTaken = "";
          if (warnCount === 2) {
            const member = await message.guild?.members.fetch(targetUser.id);
            if (member) {
              await member.timeout(3600000, "Reached 2 warnings");
              actionTaken = " (Muted for 1 hour)";
            }
          } else if (warnCount >= 5) {
            const member = await message.guild?.members.fetch(targetUser.id);
            if (member) {
              await member.ban({ reason: "Reached 5 warnings" });
              actionTaken = " (Banned)";
            }
          }
          
          return message.reply(`⚠️ **${targetUser.username}** has been warned. Total warnings: **${warnCount}**${actionTaken}`);
        }

        if (cmd === "reports") {
          const reports = await storage.getReports(message.guildId!);
          if (reports.length === 0) return message.reply("No reports found.");
          
          const reportList = reports.slice(0, 10).map(r => `• <@${r.reportedBy}> reported <@${r.userId}>: ${r.reason}`).join("\n");
          const reportEmbed = new EmbedBuilder()
            .setTitle("📋 Recent Reports")
            .setDescription(reportList)
            .setColor(0xFFFF00);
          return message.reply({ embeds: [reportEmbed] });
        }

        if (cmd === "ban") {
          const targetUser = message.mentions.users.first();
          const reason = args.slice(2).join(" ") || "No reason provided";
          if (!targetUser) return message.reply("Usage: .ban <@user> [reason]");
          
          const member = await message.guild?.members.fetch(targetUser.id);
          if (member) {
            await member.ban({ reason });
            return message.reply(`🔨 **${targetUser.username}** has been banned.`);
          }
          return message.reply("Could not find user in guild.");
        }

        if (cmd === "lock") {
          await applyLock(message.channel as TextChannel, config.targetUserId, 'mod');
          return;
        } else if (cmd === "purge") {
          const num = parseInt(args[1]);
          if (!isNaN(num)) await (message.channel as TextChannel).bulkDelete(Math.min(num, 100));
        }
      }
    }

    if (message.author.id !== config.sourceBotId) return;

    const isShinyHunt = message.content.includes("Shiny hunt pings:");
    const isRareSpawn = message.mentions.roles.has(config.detectionRoleId);
    const isRegionalSpawn = config.regionalRoleId ? message.mentions.roles.has(config.regionalRoleId) : false;

    if (isShinyHunt || isRareSpawn || isRegionalSpawn) {
      let hunterId: string | undefined;
      let lockType: 'shiny' | 'rare' | 'regional';

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
      if (activeLocks.has(channel.id)) return;

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
      let emoji = "🔒";

      if (type === 'shiny') {
        title = "✨ Shiny Hunt Locked";
        emoji = "✨";
        description = `Only <@${hunterId}> or Admins can unlock.\n\n**How to unlock:**\nClick the button below or use \`.ul\``;
        color = 0xFFA500;
      } else if (type === 'rare') {
        title = "🔒 Rare Spawn Locked";
        description = "Anyone can unlock this channel.\n\n**How to unlock:**\nClick the button below or use \`.ul\`";
      } else if (type === 'regional') {
        title = "🌏 Regional Spawn Locked";
        emoji = "🌏";
        description = "Anyone can unlock this channel.\n\n**How to unlock:**\nClick the button below or use \`.ul\`";
      } else if (type === 'mod') {
        title = "👮 Moderation Lock";
        emoji = "👮";
        description = "This channel was locked by a moderator.";
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: "ShinyHunt Manager", iconURL: ASSET_IMAGE_URL })
        .setTitle(`${emoji} ${title}`)
        .setDescription(`>>> ${description}`)
        .setImage(ASSET_IMAGE_URL)
        .setThumbnail(ASSET_IMAGE_URL)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: "Pickel • Stay Rare", iconURL: ASSET_IMAGE_URL });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("unlock_button").setLabel("Unlock Channel").setStyle(ButtonStyle.Success).setEmoji("🔓")
      );

      await channel.send({ embeds: [embed], components: [row] });
      await storage.addLog({ type: "LOCK", message: `Locked for ${type}. Hunter: ${hunterId || 'None'}`, channelName: channel.name });
    } catch (e) {
      console.error("Lock failed:", e);
    }
  }

  async function handleUnlock(source: any) {
    const channel = source.channel as TextChannel;
    if (!activeLocks.has(channel.id)) {
      if (source.reply) return source.reply({ content: "❌ Channel is already unlocked.", ephemeral: true });
      return;
    }

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
      
      const embed = new EmbedBuilder()
        .setTitle("🔓 Channel Unlocked")
        .setDescription(`Permissions have been restored by **${user.tag}**.`)
        .setColor(0x00FF00)
        .setTimestamp()
        .setFooter({ text: "Pickel Manager", iconURL: ASSET_IMAGE_URL });

      if (source.reply) {
        if (source.deferred || source.replied) {
          await source.followUp({ embeds: [embed] });
        } else {
          await source.reply({ embeds: [embed] });
        }
      } else {
        await channel.send({ embeds: [embed] });
      }

      await storage.addLog({ type: "UNLOCK", message: `Unlocked by ${user.tag}`, channelName: channel.name });
    } catch (e) {
      console.error("Unlock failed:", e);
      if (source.reply) source.reply({ content: "Failed to unlock. Check permissions.", ephemeral: true }).catch(() => {});
    }
  }

  client.login(TOKEN).catch(console.error);
}
