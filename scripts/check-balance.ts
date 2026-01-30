import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

const RPC_URL = "https://devnet.helius-rpc.com/?api-key=6e8a3b52-2fce-44d4-9d4e-c2f84bcf2624";
const TOKEN_MINT = "CynN8io5GiG4RGutAscXYKLdx56zJsP3dL8fmy4EYpmW";

async function checkBalance(walletAddress: string) {
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(TOKEN_MINT);

    console.log("\n=== Token Balance Diagnostic ===");
    console.log("Wallet:", walletAddress);
    console.log("Token Mint:", TOKEN_MINT);
    console.log("RPC:", RPC_URL);
    console.log("");

    const connection = new Connection(RPC_URL, "confirmed");

    try {
        // Get associated token account
        const ata = await getAssociatedTokenAddress(mint, wallet);
        console.log("Associated Token Account (ATA):", ata.toBase58());

        // Try to fetch the account
        const accountInfo = await connection.getAccountInfo(ata);

        if (!accountInfo) {
            console.log("\n❌ TOKEN ACCOUNT DOES NOT EXIST");
            console.log("This wallet has never received this token.");
            console.log("\nTo fix:");
            console.log("1. Send some tokens to this wallet from another wallet");
            console.log("2. Or create the token account first");
            return;
        }

        // Account exists, get balance
        const tokenAccount = await getAccount(connection, ata);
        const balance = Number(tokenAccount.amount) / Math.pow(10, 6); // 6 decimals

        console.log("\n✅ TOKEN ACCOUNT EXISTS");
        console.log("Balance:", balance, "tokens");
        console.log("Raw amount:", tokenAccount.amount.toString());

    } catch (error: any) {
        console.error("\n❌ ERROR:", error.message);
    }
}

// Get wallet address from command line
const walletAddress = process.argv[2];

if (!walletAddress) {
    console.log("Usage: npx tsx scripts/check-balance.ts <WALLET_ADDRESS>");
    console.log("\nExample:");
    console.log("npx tsx scripts/check-balance.ts BfjsShgBWb4nXDx9QXMvjeL6y9Yt3dJdJC6nSMaVXYST");
    process.exit(1);
}

checkBalance(walletAddress);
