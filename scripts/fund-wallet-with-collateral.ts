import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotent,
  mintTo,
  getMint,
  getAccount,
} from "@solana/spl-token";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const PRIVATE_KEY = process.env.PNP_PRIVATE_KEY;
const COLLATERAL_MINT = process.env.COLLATERAL_MINT;
const COLLATERAL_DECIMALS = parseInt(process.env.COLLATERAL_DECIMALS || "6");

if (!PRIVATE_KEY || !COLLATERAL_MINT) {
  console.error("❌ Missing PNP_PRIVATE_KEY or COLLATERAL_MINT in .env");
  process.exit(1);
}

async function main() {
  console.log("💰 Funding Wallet with Collateral Token\n");
  console.log("=" .repeat(60));

  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(PRIVATE_KEY)));
  const mint = new PublicKey(COLLATERAL_MINT);

  console.log(`\n📍 Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`🪙  Mint: ${mint.toBase58()}`);

  // Get mint info
  const mintInfo = await getMint(connection, mint);
  console.log(`\n✅ Mint Info:`);
  console.log(`   Decimals: ${mintInfo.decimals}`);
  console.log(`   Supply: ${mintInfo.supply}`);
  console.log(`   Mint Authority: ${mintInfo.mintAuthority?.toBase58() || "None"}`);

  // Check if wallet is mint authority
  const isMintAuthority = mintInfo.mintAuthority?.equals(wallet.publicKey);
  console.log(`\n🔑 Are you mint authority? ${isMintAuthority ? "YES ✅" : "NO ❌"}`);

  if (!isMintAuthority) {
    console.error("\n❌ ERROR: You are NOT the mint authority!");
    console.log("\n💡 Solutions:");
    console.log("   1. Use a token where you ARE the mint authority");
    console.log("   2. Or get tokens transferred from someone who has them");
    console.log("   3. Create a new token: npm run mint-token");
    process.exit(1);
  }

  // Get or create ATA
  const walletAta = getAssociatedTokenAddressSync(mint, wallet.publicKey);
  console.log(`\n📦 Your Token Account: ${walletAta.toBase58()}`);

  try {
    await createAssociatedTokenAccountIdempotent(
      connection,
      wallet,
      mint,
      wallet.publicKey
    );
    console.log("✅ Token account ready");
  } catch (err) {
    console.error("❌ Failed to create token account:", err);
    process.exit(1);
  }

  // Check current balance
  let currentBalance = 0n;
  try {
    const accountInfo = await getAccount(connection, walletAta);
    currentBalance = accountInfo.amount;
    console.log(`\n💵 Current Balance: ${currentBalance} (${Number(currentBalance) / 10 ** COLLATERAL_DECIMALS} tokens)`);
  } catch {
    console.log("\n💵 Current Balance: 0 (new account)");
  }

  // Calculate how much to mint
  const REQUIRED_PER_MARKET = 1_000_000n; // Initial liquidity
  const MARKETS_TO_SUPPORT = 100n; // Support 100 market creations
  const TARGET_AMOUNT = REQUIRED_PER_MARKET * MARKETS_TO_SUPPORT;
  
  if (currentBalance >= TARGET_AMOUNT) {
    console.log(`\n✅ You already have enough tokens!`);
    console.log(`   Current: ${currentBalance}`);
    console.log(`   Required for 100 markets: ${TARGET_AMOUNT}`);
    console.log(`\n🎉 You're ready to create markets!`);
    return;
  }

  const amountToMint = TARGET_AMOUNT - currentBalance;
  console.log(`\n🎯 Target Amount: ${TARGET_AMOUNT} (${Number(TARGET_AMOUNT) / 10 ** COLLATERAL_DECIMALS} tokens)`);
  console.log(`📊 Will mint: ${amountToMint} (${Number(amountToMint) / 10 ** COLLATERAL_DECIMALS} tokens)`);

  console.log("\n⏳ Minting tokens to your wallet...");

  try {
    const signature = await mintTo(
      connection,
      wallet,
      mint,
      walletAta,
      wallet, // mint authority
      amountToMint
    );

    console.log(`\n✅ SUCCESS! Minted tokens to your wallet`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Wait for confirmation and check new balance
    await connection.confirmTransaction(signature, "confirmed");
    
    const newAccountInfo = await getAccount(connection, walletAta);
    const newBalance = newAccountInfo.amount;
    
    console.log(`\n💰 New Balance: ${newBalance} (${Number(newBalance) / 10 ** COLLATERAL_DECIMALS} tokens)`);
    console.log(`\n🎉 You can now create ~${Number(newBalance / REQUIRED_PER_MARKET)} markets!`);
    console.log(`\n✅ Ready to run:`);
    console.log(`   npm run run:market-agent`);
    console.log(`   npm run run:discord-market-agent`);

  } catch (err: any) {
    console.error("\n❌ Minting failed:", err.message);
    
    if (err.message?.includes("insufficient lamports")) {
      console.log("\n💡 Your wallet needs SOL for transaction fees!");
      console.log(`   Run: solana airdrop 2 ${wallet.publicKey.toBase58()}`);
    }
    
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
