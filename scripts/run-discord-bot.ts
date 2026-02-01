import { Client, GatewayIntentBits, Events } from "discord.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const TRIGGER_PREFIX = process.env.DISCORD_TRIGGER_PREFIX || "!predict";

if (!DISCORD_BOT_TOKEN) {
  console.error("❌ Missing DISCORD_BOT_TOKEN in environment variables");
  process.exit(1);
}

if (!DISCORD_CHANNEL_ID) {
  console.error("❌ Missing DISCORD_CHANNEL_ID in environment variables");
  process.exit(1);
}

if (!DISCORD_GUILD_ID) {
  console.error("❌ Missing DISCORD_GUILD_ID in environment variables");
  process.exit(1);
}

// Ensure data directory exists
if (!existsSync("./data")) {
  await mkdir("./data", { recursive: true });
}

// Initialize pending messages file if it doesn't exist
const pendingFilePath = "./data/discord-pending.json";
if (!existsSync(pendingFilePath)) {
  await writeFile(pendingFilePath, JSON.stringify([], null, 2), "utf8");
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Discord bot ready! Logged in as ${c.user.tag}`);
  console.log(`📡 Monitoring channel: ${DISCORD_CHANNEL_ID}`);
  console.log(`🎯 Trigger prefix: ${TRIGGER_PREFIX}`);
  console.log(`💡 Usage: ${TRIGGER_PREFIX} <your prediction statement>`);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only process messages from the specified channel
  if (message.channelId !== DISCORD_CHANNEL_ID) return;

  // Only process messages that start with the trigger prefix
  if (!message.content.startsWith(TRIGGER_PREFIX)) return;

  // Extract the prediction statement (remove the prefix)
  const predictionContent = message.content.slice(TRIGGER_PREFIX.length).trim();

  if (!predictionContent) {
    await message.reply("❌ Please provide a prediction statement. Usage: `!predict <statement>`");
    return;
  }

  try {
    // Load existing pending messages
    const raw = await readFile(pendingFilePath, "utf8");
    const pending = JSON.parse(raw) as Array<{
      messageId: string;
      content: string;
      author: string;
      timestamp: number;
    }>;

    // Add new message to pending queue
    pending.push({
      messageId: message.id,
      content: predictionContent,
      author: message.author.tag,
      timestamp: Date.now(),
    });

    // Save updated pending messages
    await writeFile(pendingFilePath, JSON.stringify(pending, null, 2), "utf8");

    // React to the message to confirm it was captured
    await message.react("✅");
    
    // Reply with confirmation
    await message.reply(
      `🎲 Your prediction has been queued for market creation!\n` +
      `📊 Statement: "${predictionContent}"\n` +
      `⏰ The market will be created automatically by the agent.`
    );

    console.log(`📝 New prediction queued from ${message.author.tag}: "${predictionContent}"`);
  } catch (error) {
    console.error("❌ Error processing message:", error);
    await message.reply("❌ Failed to queue your prediction. Please try again.");
  }
});

client.on(Events.Error, (error) => {
  console.error("❌ Discord client error:", error);
});

// Login to Discord
console.log("🚀 Starting Discord bot...");
await client.login(DISCORD_BOT_TOKEN);
