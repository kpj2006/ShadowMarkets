import { PublicKey } from "@solana/web3.js";
import { loadEnv } from "../src/util/env.js";
import { makePnpClient } from "../src/pnp/pnpClient.js";
import { GithubPrivateSource } from "../src/sources/githubPrivateSource.js";
import { MarketCreationAgent } from "../src/agents/marketCreationAgent.js";
import { LiquidityAgent } from "../src/agents/liquidityAgent.js";
import { appendMarket } from "../src/util/marketsStore.js";
import { sleepSeconds } from "../src/util/time.js";

const MARKETS_FILE = "./data/markets.json";

async function main() {
  const env = loadEnv();

  if (!env.github) {
    console.error("❌ GitHub not configured. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO in .env");
    process.exit(1);
  }

  console.log("🐙 Starting GitHub Market Creation Agent...");
  console.log(`📡 Monitoring: ${env.github.owner}/${env.github.repo}`);

  const client = makePnpClient({ rpcUrl: env.rpcUrl, privateKey: env.pnpPrivateKey });

  const collateralMint = new PublicKey(env.collateralMint);
  const oraclePubkey = env.oracleAddress ? new PublicKey(env.oracleAddress) : client.signer!.publicKey;

  // Force GitHub source (not Discord!)
  const source = new GithubPrivateSource(env.github);
  
  const marketAgent = new MarketCreationAgent(client, source, {
    collateralMint,
    initialLiquidityBaseUnits: env.initialLiquidityBaseUnits,
    oraclePubkey,
    yesOddsBps: env.yesOddsBps,
  });
  const liquidityAgent = new LiquidityAgent(client);

  console.log("✅ Agent initialized");
  console.log("⏰ Polling every 20 seconds\n");

  // minimal loop
  let iteration = 0;
  while (true) {
    iteration++;
    console.log(`\n🔄 [${new Date().toISOString()}] Iteration ${iteration}`);

    try {
      const rec = await marketAgent.createNextMarket(env.marketDurationSeconds);
      if (rec) {
        await appendMarket(MARKETS_FILE, rec);
        console.log("🎉 New market created from GitHub issue!");
        console.log(`   Market: ${rec.market}`);
        console.log(`   Question: ${rec.question}`);
        console.log(`   Signature: ${rec.signature}`);

        if (rec.event.kind === "githubIssueWillClose") {
          console.log(`   Issue #${rec.event.issueNumber}: ${rec.event.question}`);
        }

        // IMPORTANT: activate within 15 minutes + seed small trade
        const liq = await liquidityAgent.enableTradingAndSeed(new PublicKey(rec.market), env.seedTradeAmount);
        console.log(`   Trading enabled: ${liq.enableSig}`);
        console.log(`   Seeded: ${liq.tradeSig}`);
      } else {
        console.log("⏸️  No new GitHub issues to process");
      }
    } catch (e) {
      console.error("❌ Error creating market:", e);
    }

    await sleepSeconds(20);
  }
}

main().catch((e) => {
  console.error("💥 Fatal error:", e);
  process.exit(1);
});
