import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

console.log("\n🔍 Discord Integration Health Check\n");
console.log("=" .repeat(50));

// Check .env file
if (!existsSync(".env")) {
  console.error("❌ .env file not found!");
  console.log("📝 Copy .env.discord.example to .env and configure it");
  process.exit(1);
}

const envContent = await readFile(".env", "utf8");

// Check Discord configuration
const checks = [
  { key: "DISCORD_BOT_TOKEN", required: true },
  { key: "DISCORD_CHANNEL_ID", required: true },
  { key: "DISCORD_GUILD_ID", required: true },
  { key: "DISCORD_TRIGGER_PREFIX", required: false, default: "!predict" },
  { key: "PNP_PRIVATE_KEY", required: true },
  { key: "RPC_URL", required: false, default: "https://api.devnet.solana.com" },
  { key: "COLLATERAL_MINT", required: false, default: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" },
];

let allGood = true;

for (const check of checks) {
  const hasValue = envContent.includes(`${check.key}=`) && 
                   !envContent.match(new RegExp(`${check.key}=\\s*$`, "m")) &&
                   !envContent.includes(`${check.key}=your_`);
  
  if (hasValue) {
    console.log(`✅ ${check.key}`);
  } else if (check.required) {
    console.log(`❌ ${check.key} - REQUIRED but not set`);
    allGood = false;
  } else {
    console.log(`⚠️  ${check.key} - Optional (default: ${check.default || "none"})`);
  }
}

console.log("=" .repeat(50));

if (!allGood) {
  console.log("\n❌ Configuration incomplete!");
  console.log("\n📚 Setup steps:");
  console.log("1. Create a Discord bot at https://discord.com/developers/applications");
  console.log("2. Enable MESSAGE CONTENT INTENT in bot settings");
  console.log("3. Invite bot to your server with proper permissions");
  console.log("4. Copy bot token, channel ID, and guild ID to .env");
  console.log("5. Configure your Solana wallet private key\n");
  console.log("📖 See DISCORD_SETUP.md for detailed instructions\n");
  process.exit(1);
}

// Check data directory
if (!existsSync("./data")) {
  console.log("\n⚠️  ./data directory doesn't exist yet (will be created on first run)");
} else {
  console.log("\n✅ ./data directory exists");
  
  if (existsSync("./data/discord-pending.json")) {
    const pending = JSON.parse(await readFile("./data/discord-pending.json", "utf8"));
    console.log(`📊 Pending predictions: ${pending.length}`);
  }
  
  if (existsSync("./data/discord-markets.json")) {
    const markets = JSON.parse(await readFile("./data/discord-markets.json", "utf8"));
    console.log(`📈 Markets created: ${markets.markets?.length || 0}`);
  }
}

console.log("\n✅ Configuration looks good!");
console.log("\n🚀 Next steps:");
console.log("1. Terminal 1: npm run run:discord-bot");
console.log("2. Terminal 2: npm run run:discord-market-agent");
console.log("\n💡 Users can create markets by posting:");
console.log(`   ${process.env.DISCORD_TRIGGER_PREFIX || "!predict"} <prediction statement>\n`);
