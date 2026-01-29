import { loadEnv } from "../src/util/env.js";
import { makePnpClient } from "../src/pnp/pnpClient.js";
import { makeEventSource } from "../src/sources/makeSource.js";
import { OracleAgent } from "../src/agents/oracleAgent.js";
import { OpenAiCompatibleOracle } from "../src/llm/openaiCompatible.js";
import { loadMarkets, markSettled } from "../src/util/marketsStore.js";
import { sleepSeconds } from "../src/util/time.js";

const MARKETS_FILE = "./data/markets.json";

async function main() {
  const env = loadEnv();
  const client = makePnpClient({ rpcUrl: env.rpcUrl, privateKey: env.pnpPrivateKey });
  const source = makeEventSource(env);
  const llm = env.llm ? new OpenAiCompatibleOracle(env.llm) : null;
  const oracle = new OracleAgent(client, source, llm);

  console.log("ShadowMarkets AI oracle agent running. Checking every 20s.");

  while (true) {
    try {
      const doc = await loadMarkets(MARKETS_FILE);
      for (const rec of doc.markets) {
        if (rec.settled) continue;

        const status = await oracle.settleIfReady({ market: rec.market, event: rec.event });
        if (status.didSettle) {
          await markSettled(MARKETS_FILE, rec.market);
          console.log(`Settled market ${rec.market} yesWinner=${status.yesWinner} tx=${status.signature}`);
        }
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

