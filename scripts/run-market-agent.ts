import { PublicKey } from "@solana/web3.js";
import { loadEnv } from "../src/util/env.js";
import { makePnpClient } from "../src/pnp/pnpClient.js";
import { makeEventSource } from "../src/sources/makeSource.js";
import { MarketCreationAgent } from "../src/agents/marketCreationAgent.js";
import { LiquidityAgent } from "../src/agents/liquidityAgent.js";
import { appendMarket } from "../src/util/marketsStore.js";
import { sleepSeconds } from "../src/util/time.js";

const MARKETS_FILE = "./data/markets.json";

async function main() {
  const env = loadEnv();
  const client = makePnpClient({ rpcUrl: env.rpcUrl, privateKey: env.pnpPrivateKey });

  const collateralMint = new PublicKey(env.collateralMint);
  const oraclePubkey = env.oracleAddress ? new PublicKey(env.oracleAddress) : client.signer!.publicKey;

  const source = makeEventSource(env);
  const marketAgent = new MarketCreationAgent(client, source, {
    collateralMint,
    initialLiquidityBaseUnits: env.initialLiquidityBaseUnits,
    oraclePubkey,
    yesOddsBps: env.yesOddsBps,
  });
  const liquidityAgent = new LiquidityAgent(client);

  console.log("ShadowMarkets AI market agent running. Polling every 20s.");

  // minimal loop
  while (true) {
    try {
      const rec = await marketAgent.createNextMarket(env.marketDurationSeconds);
      if (rec) {
        await appendMarket(MARKETS_FILE, rec);
        console.log(`Created market ${rec.market}`);

        // IMPORTANT: activate within 15 minutes + seed small trade
        const liq = await liquidityAgent.enableTradingAndSeed(new PublicKey(rec.market), env.seedTradeUsdc);
        console.log(`Enabled trading tx=${liq.enableSig} | seeded tx=${liq.tradeSig}`);
      }
    } catch (e) {
      console.error(e);
    }

    await sleepSeconds(20);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

