import { PublicKey } from "@solana/web3.js";
import { loadEnv } from "../src/util/env.js";
import { makePnpClient } from "../src/pnp/pnpClient.js";
import { LiquidityAgent } from "../src/agents/liquidityAgent.js";

function mustGet(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function main() {
  const env = loadEnv();
  const marketAddress = mustGet("MARKET_ADDRESS");
  const market = new PublicKey(marketAddress);

  const client = makePnpClient({ rpcUrl: env.rpcUrl, privateKey: env.pnpPrivateKey });
  const agent = new LiquidityAgent(client);

  const res = await agent.enableTradingAndSeed(market, env.seedTradeUsdc);

  console.log(
    JSON.stringify(
      {
        market: market.toBase58(),
        enabledTx: res.enableSig,
        seededTx: res.tradeSig,
      },
      null,
      2,
    ),
  );
  console.log(`Market: https://explorer.solana.com/address/${market.toBase58()}?cluster=devnet`);
}

main().catch((e) => {
  const errorMsg = e instanceof Error ? e.message : String(e);
  const errorStr = String(e); // Full error including stack/logs

  // Check for specific error cases and provide helpful messages
  if (errorStr.includes("MarketEnded") || errorStr.includes("Market has ended") || errorStr.includes("Error Number: 6000")) {
    console.error("\n❌ Error: Market has already ended!");
    console.error("\n💡 The market deadline passed before you could seed it.");
    console.error("   This happens when the market duration is too short.");
    console.error("\n📝 Solutions:");
    console.error("   1. Create a new market: npm run create-market");
    console.error("   2. Seed it immediately (you have ~90 seconds with 2-min duration)");
    console.error("   3. Or increase MARKET_DURATION_SECONDS in .env for more time\n");
  } else if (errorStr.includes("already activated") || errorStr.includes("0x0") || errorStr.includes("custom program error: 0x0")) {
    console.error("\n❌ Error: Market is already activated/seeded!");
    console.error("\n💡 This market was already seeded. You can only seed once.");
    console.error("   The market is already live and trading.\n");
  } else if (errorStr.includes("fetch failed") || errorStr.includes("network") || errorStr.includes("ECONNREFUSED")) {
    console.error("\n❌ Error: Network/RPC connection failed!");
    console.error("\n💡 The Solana RPC endpoint is not responding.");
    console.error("   Try changing RPC_URL in .env to:");
    console.error("   - https://rpc.ankr.com/solana_devnet");
    console.error("   - Or wait a moment and try again\n");
  } else {
    console.error("\n💥 Unexpected error seeding market:");
    console.error(errorMsg);
    console.error("\nIf you need more details, check the full error above.\n");
  }

  process.exit(1);
});
