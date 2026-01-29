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
  console.error(e);
  process.exit(1);
});

