// Script to redeem positions using pnp-sdk (same package that created markets)
import { PublicKey } from "@solana/web3.js";
import { PNPClient } from "pnp-sdk";
import { loadEnv } from "../src/util/env.js";

const MARKET_ADDRESS = process.argv[2];

if (!MARKET_ADDRESS) {
    console.error("Usage: npx tsx scripts/redeem-position.ts <MARKET_ADDRESS>");
    process.exit(1);
}

async function main() {
    const env = loadEnv();

    // Initialize client with private key (required for signing)
    const secretKey = PNPClient.parseSecretKey(env.pnpPrivateKey);
    const client = new PNPClient(env.rpcUrl, secretKey);

    console.log("=== Redeem Position ===");
    console.log("Market:", MARKET_ADDRESS);
    console.log("Wallet:", client.signer?.publicKey.toBase58());

    try {
        const marketPk = new PublicKey(MARKET_ADDRESS);

        // Use pnp-sdk's redeemPosition which handles Token-2022 correctly
        const result = await client.redeemPosition(marketPk);

        console.log("\n✅ Redemption successful!");
        console.log("Signature:", result.signature);
        console.log(`Explorer: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);
    } catch (error: any) {
        console.error("\n❌ Redemption failed:", error.message);
        if (error.logs) {
            console.error("\nLogs:", error.logs);
        }
        process.exit(1);
    }
}

main();
