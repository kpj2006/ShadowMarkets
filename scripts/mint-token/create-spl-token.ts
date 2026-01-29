/**
 * Devnet Script: Create and Mint SPL Token
 *
 * Creates a new SPL token mint and mints 10 million tokens to your wallet.
 * Perfect for hackathon testing - no need for external faucets!
 *
 * Usage:
 * npm run mint-token
 *
 * Environment Variables:
 * PNP_PRIVATE_KEY (or DEVNET_PRIVATE_KEY / TEST_PRIVATE_KEY) - Your wallet private key
 * RPC_URL - Solana RPC endpoint (defaults to devnet)
 * TOKEN_DECIMALS - Number of decimals (default: 6)
 * MINT_AMOUNT_UI - How many whole tokens to mint (default: 10000000 = 10M tokens)
 * MINT_AMOUNT_RAW - Raw base units to mint (overrides MINT_AMOUNT_UI)
 */

import { config as dotenvConfig } from "dotenv";
import { PublicKey, Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { loadEnv } from "../../src/util/env.js";
import { PNPClient } from "pnp-sdk";
import { writeFile } from "node:fs/promises";

dotenvConfig();

const TOKEN_INFO_FILE = "./data/token-mint.json";

async function checkSolBalance(connection: Connection, pubkey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
}

async function main() {
  console.log("\n🪙 Creating SPL Token for Hackathon Testing\n");
  console.log("═".repeat(60));

  const env = loadEnv();

  // Parse private key and create Keypair
  const secretKey = PNPClient.parseSecretKey(env.pnpPrivateKey);
  const wallet = Keypair.fromSecretKey(secretKey);
  const walletPubkey = wallet.publicKey;

  // Create connection
  const connection = new Connection(env.rpcUrl, "confirmed");

  console.log(`✓ Connected to: ${env.rpcUrl}`);
  console.log(`✓ Wallet: ${walletPubkey.toBase58()}`);

  // Check SOL balance (need SOL for transaction fees)
  const solBalance = await checkSolBalance(connection, walletPubkey);
  console.log(`\n💰 SOL Balance: ${solBalance} SOL`);

  if (solBalance < 0.1) {
    console.warn("\n⚠️  Warning: Low SOL balance (< 0.1 SOL)");
    console.warn("   You may need SOL for transaction fees.");
    console.warn(`   Airdrop: solana airdrop 2 ${walletPubkey.toBase58()} --url devnet`);
  }

  // Token parameters
  const decimals = Number(process.env.TOKEN_DECIMALS || "6");
  const rawOverride = process.env.MINT_AMOUNT_RAW;
  const uiAmountStr = process.env.MINT_AMOUNT_UI || "10000000"; // 10M whole tokens by default
  const uiAmount = BigInt(uiAmountStr);
  const base = 10n ** BigInt(decimals);
  const mintAmountRaw = rawOverride ? BigInt(rawOverride) : uiAmount * base;
  const mintAmountUi = Number(rawOverride ? mintAmountRaw / base : uiAmount);

  console.log(`\n📋 Token Configuration:`);
  console.log(`   Decimals: ${decimals}`);
  console.log(`   Mint Amount: ${mintAmountUi.toLocaleString()} tokens`);
  console.log(`   Raw Amount: ${mintAmountRaw.toString()}`);

  // Create mint
  console.log(`\n🚀 Creating token mint...`);
  const mint = await createMint(
    connection,
    wallet, // Payer (Keypair)
    walletPubkey, // Mint authority
    walletPubkey, // Freeze authority (can be null, but we use wallet for simplicity)
    decimals,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID,
  );

  console.log(`✅ Token mint created: ${mint.toBase58()}`);

  // Get or create associated token account
  console.log(`\n📝 Creating token account...`);
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet, // Payer (Keypair)
    mint,
    walletPubkey, // Owner
  );

  console.log(`✅ Token account: ${tokenAccount.address.toBase58()}`);

  // Mint tokens
  console.log(`\n🪙 Minting ${mintAmountUi.toLocaleString()} tokens...`);
  const mintSig = await mintTo(
    connection,
    wallet, // Payer (Keypair)
    mint,
    tokenAccount.address,
    walletPubkey, // Mint authority
    mintAmountRaw,
  );

  console.log(`✅ Mint transaction: ${mintSig}`);

  // Verify balance
  const mintInfo = await getMint(connection, mint);
  const balance = await connection.getTokenAccountBalance(tokenAccount.address);
  const balanceUi = balance.value.uiAmountString;

  console.log(`\n✅ Verification:`);
  console.log(`   Mint Address: ${mint.toBase58()}`);
  console.log(`   Token Account: ${tokenAccount.address.toBase58()}`);
  console.log(`   Your Balance: ${balanceUi} tokens`);
  console.log(`   Total Supply: ${Number(mintInfo.supply) / 10 ** decimals} tokens`);

  // Save token info
  const tokenInfo = {
    mint: mint.toBase58(),
    tokenAccount: tokenAccount.address.toBase58(),
    decimals,
    mintAmount: mintAmountRaw.toString(),
    mintAmountUi: mintAmountUi,
    createdAt: new Date().toISOString(),
    network: env.rpcUrl.includes("devnet") ? "devnet" : env.rpcUrl.includes("mainnet") ? "mainnet" : "unknown",
  };

  await writeFile(TOKEN_INFO_FILE, JSON.stringify(tokenInfo, null, 2), "utf8");

  console.log(`\n💾 Token info saved to: ${TOKEN_INFO_FILE}`);

  console.log("\n" + "═".repeat(60));
  console.log("✅ SPL TOKEN CREATED SUCCESSFULLY!");
  console.log("═".repeat(60));
  console.log(JSON.stringify(tokenInfo, null, 2));

  console.log("\n📝 Next Steps:");
  console.log(`   1. Add to your .env file:`);
  console.log(`      COLLATERAL_MINT=${mint.toBase58()}`);
  console.log(`      COLLATERAL_DECIMALS=${decimals}`);
  console.log(`   2. Run: npm run create-market`);
  console.log(`\n🔗 Explorer:`);
  console.log(`   Mint: https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);
  console.log(`   Token Account: https://explorer.solana.com/address/${tokenAccount.address.toBase58()}?cluster=devnet`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) {
    console.error("\nStack:", err.stack);
  }
  process.exit(1);
});
