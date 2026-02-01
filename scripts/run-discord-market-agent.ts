import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { PNPClient } from "pnp-sdk";
import { loadEnv } from "../src/util/env.js";
import { MarketCreationAgent } from "../src/agents/marketCreationAgent.js";
import { makeEventSource } from "../src/sources/makeSource.js";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { CreatedMarketRecord } from "../src/agents/marketCreationAgent.js";

const env = loadEnv();

if (!env.discord) {
  console.error("❌ Discord not configured. Set DISCORD_CHANNEL_ID and DISCORD_GUILD_ID in .env");
  process.exit(1);
}

// Ensure data directory exists
if (!existsSync("./data")) {
  await mkdir("./data", { recursive: true });
}

const MARKETS_FILE = "./data/markets.json";
const POLL_INTERVAL_MS = 10_000; // Check every 10 seconds

// Initialize markets file if it doesn't exist
if (!existsSync(MARKETS_FILE)) {
  await writeFile(MARKETS_FILE, JSON.stringify({ markets: [] }, null, 2), "utf8");
}

async function loadMarkets(): Promise<CreatedMarketRecord[]> {
  try {
    const raw = await readFile(MARKETS_FILE, "utf8");
    const data = JSON.parse(raw) as { markets: CreatedMarketRecord[] };
    return data.markets || [];
  } catch {
    return [];
  }
}

async function saveMarkets(markets: CreatedMarketRecord[]): Promise<void> {
  await writeFile(MARKETS_FILE, JSON.stringify({ markets }, null, 2), "utf8");
}

async function main() {
  console.log("🤖 Starting Discord Market Creation Agent...");
  console.log(`📡 Monitoring Discord channel: ${env.discord!.channelId}`);
  console.log(`🏢 Guild ID: ${env.discord!.guildId}`);

  const connection = new Connection(env.rpcUrl, "confirmed");
  const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(env.pnpPrivateKey)));

  console.log(`💰 Wallet: ${wallet.publicKey.toBase58()}`);

  const client = new PNPClient(env.rpcUrl, wallet);
  const eventSource = makeEventSource(env);

  const oraclePubkey = env.oracleAddress
    ? new PublicKey(env.oracleAddress)
    : wallet.publicKey; // self-settle for demo

  const agent = new MarketCreationAgent(client, eventSource, {
    collateralMint: new PublicKey(env.collateralMint),
    initialLiquidityBaseUnits: env.initialLiquidityBaseUnits,
    oraclePubkey,
    yesOddsBps: env.yesOddsBps,
  });

  console.log("✅ Agent initialized");
  console.log(`⏰ Polling interval: ${POLL_INTERVAL_MS}ms`);
  console.log("\n📊 Waiting for Discord predictions...\n");

  let iteration = 0;

  while (true) {
    iteration++;
    console.log(`\n🔄 [${new Date().toISOString()}] Iteration ${iteration}`);

    try {
      const markets = await loadMarkets();
      console.log(`📈 Total markets created: ${markets.length}`);

      const record = await agent.createNextMarket(env.marketDurationSeconds);

      if (record) {
        console.log("🎉 New market created from Discord prediction!");
        console.log(`   Market: ${record.market}`);
        console.log(`   Question: ${record.question}`);
        console.log(`   Signature: ${record.signature}`);
        console.log(`   End time: ${new Date(record.endTimeSeconds * 1000).toISOString()}`);

        if (record.event.kind === "discordPrediction") {
          console.log(`   Discord Author: ${record.event.author}`);
          console.log(`   Original Message: ${record.event.messageContent}`);
        }

        markets.push(record);
        await saveMarkets(markets);
      } else {
        console.log("⏸️  No new Discord predictions to process");
      }
    } catch (err) {
      console.error("❌ Error creating market:", err);
    }

    // Wait before next iteration
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
