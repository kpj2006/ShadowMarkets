import { PublicKey } from "@solana/web3.js";
import { loadEnv } from "../src/util/env.js";
import { makePnpClient } from "../src/pnp/pnpClient.js";
import { makeEventSource } from "../src/sources/makeSource.js";
import { OracleAgent } from "../src/agents/oracleAgent.js";
import { GeminiOracle } from "../src/llm/gemini.js";
import { loadMarkets, markSettled } from "../src/util/marketsStore.js";
import { sleepSeconds } from "../src/util/time.js";

const MARKETS_FILE = "./data/markets.json";

function mustGet(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function main() {
  const env = loadEnv();
  const marketAddress = mustGet("MARKET_ADDRESS");

  const wait = (process.env.WAIT ?? "false").toLowerCase() === "true";

  const client = makePnpClient({ rpcUrl: env.rpcUrl, privateKey: env.pnpPrivateKey });
  const source = makeEventSource(env);

  const llm = env.llm ? new GeminiOracle(env.llm) : null;
  const oracle = new OracleAgent(client, source, llm);

  const markets = await loadMarkets(MARKETS_FILE);
  const rec = markets.markets.find((m) => m.market === marketAddress);

  if (!rec) {
    const yes = (process.env.YES_WINNER ?? "").toLowerCase();
    if (yes !== "true" && yes !== "false") {
      throw new Error(
        `Market ${marketAddress} not found in ${MARKETS_FILE}. Set YES_WINNER=true|false to settle manually.`,
      );
    }
    const res = await client.settleMarket({
      market: new PublicKey(marketAddress),
      yesWinner: yes === "true",
    });
    console.log(JSON.stringify({ market: marketAddress, signature: res.signature, yesWinner: yes === "true" }, null, 2));
    return;
  }

  while (true) {
    const status = await oracle.settleIfReady({ market: rec.market, event: rec.event });
    if (status.didSettle) {
      await markSettled(MARKETS_FILE, rec.market);
      console.log(JSON.stringify(status, null, 2));
      console.log(`TX: https://explorer.solana.com/tx/${status.signature}?cluster=devnet`);
      return;
    }

    if (!wait) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    console.log(JSON.stringify(status, null, 2));
    await sleepSeconds(15);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

