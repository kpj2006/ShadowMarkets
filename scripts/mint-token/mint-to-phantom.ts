/**
 * Devnet Script: Mint Existing SPL Token to a Specific Address
 *
 * Mints existing SPL tokens to a provided wallet address.
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
    getOrCreateAssociatedTokenAccount,
    mintTo,
    getMint,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { loadEnv } from "../../src/util/env.js";
import { PNPClient } from "pnp-sdk";

async function main() {
    const env = loadEnv();
    const args = process.argv.slice(2);
    const destinationAddress = args[0] || "9jUnvFX7MD4rT5yU2v2stMoxzxXcBWYLURW1ZAnybVm6";
    const amountToMintStr = args[1] || "1000"; // Default 1000 tokens

    console.log("\n🪙 Minting SPL Token to Specific Address\n");
    console.log("═".repeat(60));

    // Parse private key and create Keypair
    const secretKey = PNPClient.parseSecretKey(env.pnpPrivateKey);
    const wallet = Keypair.fromSecretKey(secretKey);
    const walletPubkey = wallet.publicKey;

    // Create connection
    const connection = new Connection(env.rpcUrl, "confirmed");

    console.log(`✓ Connected to: ${env.rpcUrl}`);
    console.log(`✓ Mint Authority: ${walletPubkey.toBase58()}`);
    console.log(`✓ Token Mint: ${env.collateralMint}`);
    console.log(`✓ Destination: ${destinationAddress}`);

    const mintPubkey = new PublicKey(env.collateralMint);
    const destinationPubkey = new PublicKey(destinationAddress);

    // Get mint info to verify decimals
    const mintInfo = await getMint(connection, mintPubkey);
    const decimals = mintInfo.decimals;
    const amountToMintRaw = BigInt(amountToMintStr) * (10n ** BigInt(decimals));

    console.log(`✓ Tokens to mint: ${amountToMintStr} (${amountToMintRaw.toString()} raw units)`);

    // Get or create associated token account for destination
    console.log(`\n📝 Getting/Creating token account for destination...`);
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet, // Payer (Keypair)
        mintPubkey,
        destinationPubkey, // Owner
    );

    console.log(`✅ Token account: ${tokenAccount.address.toBase58()}`);

    // Mint tokens
    console.log(`\n🪙 Minting ${amountToMintStr} tokens...`);
    const mintSig = await mintTo(
        connection,
        wallet, // Payer (Keypair)
        mintPubkey,
        tokenAccount.address,
        walletPubkey, // Mint authority
        amountToMintRaw,
    );

    console.log(`✅ Mint transaction: ${mintSig}`);
    console.log(`\n🔗 Explorer: https://explorer.solana.com/tx/${mintSig}?cluster=devnet`);

    console.log("\n" + "═".repeat(60));
    console.log("✅ TOKENS MINTED SUCCESSFULLY!");
    console.log("═".repeat(60));
}

main().catch((err) => {
    console.error("\n❌ Error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
});
