// Simple redemption test using pnp-sdk
import { PublicKey } from "@solana/web3.js";
import { PNPClient } from "pnp-sdk";
import dotenv from "dotenv";
dotenv.config();

const MARKET_ADDRESS = "98cqrdffu6CcxrnvHHBqaDPkXLQ3uVcQASUGGtL6UHU2";
const RPC = "https://devnet.helius-rpc.com/?api-key=6e8a3b52-2fce-44d4-9d4e-c2f84bcf2624";

const PRIVATE_KEY = process.env.PNP_PRIVATE_KEY;
if (!PRIVATE_KEY) {
    console.error("PNP_PRIVATE_KEY not set in .env");
    process.exit(1);
}

async function main() {
    try {
        const secretKey = PNPClient.parseSecretKey(PRIVATE_KEY);
        const client = new PNPClient(RPC, secretKey);
        
        console.log("=== Redeem Position ===");
        console.log("Market:", MARKET_ADDRESS);
        console.log("Wallet:", client.signer?.publicKey.toBase58());
        
        const marketPk = new PublicKey(MARKET_ADDRESS);
        const result = await client.redeemPosition(marketPk);
        
        console.log("\n✅ Redemption successful!");
        console.log("Signature:", result.signature);
    } catch (error) {
        console.error("\n❌ Redemption failed:", error.message);
        console.error(error);
    }
}

main();
