import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { loadEnv } from "../src/util/env.js";
import { makePnpClient } from "../src/pnp/pnpClient.js";
import { makeEventSource } from "../src/sources/makeSource.js";
import { MarketCreationAgent } from "../src/agents/marketCreationAgent.js";
import { appendMarket } from "../src/util/marketsStore.js";

const MARKETS_FILE = "./data/markets.json";

async function checkBalance(
  client: ReturnType<typeof makePnpClient>,
  collateralMint: PublicKey,
  requiredAmount: bigint,
  decimals: number,
): Promise<void> {
  const walletPubkey = client.signer!.publicKey;
  const tokenAta = getAssociatedTokenAddressSync(collateralMint, walletPubkey);

  console.log(`\n💰 Checking token balance...`);
  console.log(`   Wallet: ${walletPubkey.toBase58()}`);
  console.log(`   Token Mint: ${collateralMint.toBase58()}`);
  console.log(`   Required: ${requiredAmount.toString()} (${Number(requiredAmount) / 10 ** decimals} tokens)`);

  try {
    const balance = await client.client.connection.getTokenAccountBalance(tokenAta);
    const balanceAmount = BigInt(balance.value.amount);
    const uiAmount = balance.value.uiAmountString ?? "0";

    console.log(`   Current Balance: ${uiAmount} (${balanceAmount.toString()} raw units)`);

    if (balanceAmount < requiredAmount) {
      console.error(`\n❌ Insufficient balance!`);
      console.error(`   Have: ${uiAmount}`);
      console.error(`   Need: ${Number(requiredAmount) / 10 ** decimals} tokens`);
      console.error(`\n💡 Solutions:`);
      console.error(`   1. Get devnet tokens from faucet:`);
      console.error(`      - Faucet: https://faucet.circle.com/ (for USDC) or your custom token source`);
      console.error(`      - Or create your own SPL token on devnet`);
      console.error(`   2. Update INITIAL_LIQUIDITY_BASE_UNITS in .env to a smaller amount`);
      throw new Error(
        `Insufficient balance. Have ${uiAmount}, need ${Number(requiredAmount) / 10 ** decimals} tokens.`,
      );
    }
    console.log(`   ✅ Sufficient balance`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("could not find account")) {
      console.error(`\n❌ Token account does not exist!`);
      console.error(`   You need to receive tokens first (create the token account).`);
      console.error(`\n💡 Solutions:`);
      console.error(`   1. Get tokens from faucet: https://faucet.circle.com/ (for USDC) or your custom token source`);
      console.error(`   2. Or create your own SPL token and mint some to your wallet`);
      throw new Error(`Token account not found. You need to receive tokens first.`);
    }
    throw error;
  }
}

async function main() {
  const env = loadEnv();
  const client = makePnpClient({ rpcUrl: env.rpcUrl, privateKey: env.pnpPrivateKey });

  const collateralMint = new PublicKey(env.collateralMint);
  const oraclePubkey = env.oracleAddress ? new PublicKey(env.oracleAddress) : client.signer!.publicKey;

  // Check balance BEFORE attempting market creation
  await checkBalance(client, collateralMint, env.initialLiquidityBaseUnits, env.collateralDecimals);

  const source = makeEventSource(env);
  const agent = new MarketCreationAgent(client, source, {
    collateralMint,
    initialLiquidityBaseUnits: env.initialLiquidityBaseUnits,
    oraclePubkey,
    yesOddsBps: env.yesOddsBps,
  });

  const rec = await agent.createNextMarket(env.marketDurationSeconds);
  if (!rec) {
    console.log("No new private events to market-ize.");
    return;
  }

  await appendMarket(MARKETS_FILE, rec);

  console.log(JSON.stringify(rec, null, 2));
  console.log(`Explorer: https://explorer.solana.com/address/${rec.market}?cluster=devnet`);
  console.log("\n⚠️  DEVNET REQUIREMENT:");
  console.log("   On devnet, you MUST call setMarketResolvable(true) to enable trading.");
  console.log("   Next step: run `npm run seed-liquidity` (it handles this automatically).");
  console.log("   Or manually: MARKET_ADDRESS=" + rec.market + " npm run seed-liquidity");
}

main().catch((e) => {
  console.error("\n💥 Error creating market:", e instanceof Error ? e.message : String(e));
  if (e instanceof Error && e.message.includes("debit")) {
    console.error("\n💡 This usually means:");
    console.error("   1. Your wallet doesn't have a token account for the collateral mint");
    console.error("   2. OR your token account has zero balance");
    console.error("   3. Get tokens from a faucet or create your own SPL token");
  }
  process.exit(1);
});

