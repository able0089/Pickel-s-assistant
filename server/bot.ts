import { Client, GatewayIntentBits, TextChannel, PermissionsBitField } from "discord.js";
import { storage } from "./storage";

// Global bot instance
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Track active shiny hunts/locks
interface ActiveLock {
  hunterId?: string; // The user who was pinged (the shiny hunter)
  channelId: string;
  lockedAt: Date;
  isShinyHunt: boolean;
}

const activeLocks = new Map<string, ActiveLock>(); // Map<channelId, ActiveLock>

export async function startBot() {
  if (!process.env.DISCORD_TOKEN) {
    console.log("DISCORD_TOKEN not set, skipping bot startup");
    return;
  }

  client.once("ready", () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    storage.addLog({
      type: "INFO",
      message: `Bot started as ${client.user?.tag}`,
      channelName: "System",
    });
  });

  client.on("messageCreate", async (message) => {
    // Ignore messages from self
    if (message.author.id === client.user?.id) return;

    // Get config
    const config = await storage.getConfig();
    if (!config || !config.isSystemEnabled) return;

    // 1. Detection Logic: Message from p2a ap (or any bot?)
    // The user said "When a specific Pokémon bot (for example, p2a ap) sends a message"
    // We should probably check if it mentions the role.
    // Assuming the user might want to configure the bot ID later, but for now we'll check if it mentions the detection role.
    
    // Check if message mentions the detection role
    if (message.mentions.roles.has(config.detectionRoleId)) {
      // It's a spawn message!
      
      // Determine if it's a shiny hunt
      // Logic: If a user is also pinged, they are the hunter.
      // Usually P2A pings the role and sometimes a user? 
      // User says: "only the pinged hunter and admins can unlock"
      // So we assume the spawn message pings a user too.
      
      const pingedUser = message.mentions.users.first(); // Naive check, might need refinement
      const isShinyHunt = !!pingedUser;

      const channel = message.channel as TextChannel;
      
      try {
        // Lock the channel: Remove Send Messages from Target Role
        const targetRole = message.guild?.roles.cache.get(config.targetRoleId);
        if (targetRole) {
          await channel.permissionOverwrites.edit(targetRole, {
            SendMessages: false,
          });

          // Record the lock
          activeLocks.set(channel.id, {
            hunterId: pingedUser?.id,
            channelId: channel.id,
            lockedAt: new Date(),
            isShinyHunt,
          });

          await message.channel.send({
            embeds: [{
              title: "🔒 Channel Locked",
              description: `A rare spawn has appeared! Channel is locked for <@&${config.targetRoleId}>.\n${isShinyHunt && pingedUser ? `**Shiny Hunt**: Only <@${pingedUser.id}> or Admins can unlock.` : "Admins can unlock."}\nUse \`.unlock\` to restore permissions.`,
              color: 0xFF0000, // Red
            }]
          });

          await storage.addLog({
            type: "LOCK",
            message: `Locked channel for spawn. Hunter: ${pingedUser?.tag || "None"}`,
            channelName: channel.name,
          });
        }
      } catch (error) {
        console.error("Failed to lock channel:", error);
        await storage.addLog({
          type: "ERROR",
          message: `Failed to lock channel: ${error}`,
          channelName: channel.name,
        });
      }
    }

    // 2. Unlock Logic: .unlock or .ul command
    const isUnlockCmd = message.content.trim() === ".unlock" || message.content.trim() === ".ul";
    if (isUnlockCmd) {
      const lockInfo = activeLocks.get(message.channel.id);
      
      // Check permissions
      const member = message.member;
      if (!member) return;

      const isAdmin = config.adminRoleId ? member.roles.cache.has(config.adminRoleId) : member.permissions.has(PermissionsBitField.Flags.Administrator);
      const isHunter = lockInfo?.hunterId === member.id;

      // Allow everyone to unlock rare spawns (non-shiny hunt)
      // If it's a shiny hunt, only hunter or admins
      const canUnlock = !lockInfo?.isShinyHunt || isAdmin || isHunter;

      if (canUnlock) {
        const channel = message.channel as TextChannel;
        const targetRole = message.guild?.roles.cache.get(config.targetRoleId);
        
        if (targetRole) {
          try {
            await channel.permissionOverwrites.edit(targetRole, {
              SendMessages: null, // Reset to default/inherit
            });

            activeLocks.delete(channel.id);

            await message.channel.send({
              embeds: [{
                title: "🔓 Channel Unlocked",
                description: "Permissions have been restored. Good luck!",
                color: 0x00FF00, // Green
              }]
            });

             await storage.addLog({
              type: "UNLOCK",
              message: `Unlocked by ${member.user.tag}`,
              channelName: channel.name,
            });

          } catch (error) {
             console.error("Failed to unlock channel:", error);
             await message.reply("Failed to unlock channel. Check bot permissions.");
          }
        }
      } else {
        // Deny unlock
        await message.reply("🔒 This is a shiny hunt! Only the hunter or admins can unlock.");
      }
      return;
    }

    // 3. Admin Commands
    const args = message.content.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();
    const isAdmin = config.adminRoleId ? message.member?.roles.cache.has(config.adminRoleId) : message.member?.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!isAdmin) return;

    if (cmd === ".lock") {
      const channel = message.channel as TextChannel;
      const targetRole = message.guild?.roles.cache.get(config.targetRoleId);
      if (targetRole) {
        await channel.permissionOverwrites.edit(targetRole, { SendMessages: false });
        await message.channel.send("🔒 Channel locked manually by admin.");
      }
    } else if (cmd === ".purge") {
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount < 1 || amount > 100) return message.reply("Usage: .purge [1-100]");
      const channel = message.channel as TextChannel;
      await channel.bulkDelete(amount, true);
      const msg = await message.channel.send(`🧹 Purged ${amount} messages.`);
      setTimeout(() => msg.delete().catch(() => {}), 3000);
    } else if (cmd === ".mute") {
      const target = message.mentions.members?.first();
      const time = parseInt(args[2]); // in minutes
      if (!target || isNaN(time)) return message.reply("Usage: .mute @user [time_in_minutes]");
      try {
        await target.timeout(time * 60 * 1000, "Muted via command");
        await message.channel.send(`🔇 Muted ${target.user.tag} for ${time} minutes.`);
      } catch (e) {
        await message.reply("Failed to mute user. Check roles.");
      }
    } else if (cmd === ".unmute") {
      const target = message.mentions.members?.first();
      if (!target) return message.reply("Usage: .unmute @user");
      try {
        await target.timeout(null);
        await message.channel.send(`🔊 Unmuted ${target.user.tag}.`);
      } catch (e) {
        await message.reply("Failed to unmute user.");
      }
    } else if (cmd === ".ban") {
      const target = message.mentions.members?.first();
      if (!target) return message.reply("Usage: .ban @user");
      try {
        await target.ban({ reason: "Banned via command" });
        await message.channel.send(`🔨 Banned ${target.user.tag}.`);
      } catch (e) {
        await message.reply("Failed to ban user.");
      }
    }
  });

  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error("Failed to login to Discord:", err);
  }
}
