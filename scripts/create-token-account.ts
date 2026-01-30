import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const RPC_URL = process.env.RPC_URL || "https://rpc.ankr.com/solana_devnet";
const TOKEN_MINT = process.env.COLLATERAL_MINT || "CynN8io5GiG4RGutAscXYKLdx56zJsP3dL8fmy4EYpmW";

async function createTokenAccount(targetWalletAddress: string) {
    const connection = new Connection(RPC_URL, "confirmed");
    const mint = new PublicKey(TOKEN_MINT);
    const targetWallet = new PublicKey(targetWalletAddress);

    // Parse payer from env
    const privateKeyArray = JSON.parse(process.env.PNP_PRIVATE_KEY || "[]");
    if (privateKeyArray.length === 0) {
        throw new Error("PNP_PRIVATE_KEY not set in .env");
    }
    const payer = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

    console.log("\n=== Creating Token Account ===");
    console.log("Target Wallet:", targetWalletAddress);
    console.log("Token Mint:", TOKEN_MINT);
    console.log("Payer:", payer.publicKey.toBase58());
    console.log("");

    try {
        const ata = await getAssociatedTokenAddress(mint, targetWallet);
        console.log("Associated Token Account (ATA):", ata.toBase58());

        // Check if it already exists
        const accountInfo = await connection.getAccountInfo(ata);
        if (accountInfo) {
            console.log("\n✅ Token account already exists!");
            return;
        }

        // Create the account
        const ix = createAssociatedTokenAccountInstruction(
            payer.publicKey,
            ata,
            targetWallet,
            mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const { Transaction } = await import("@solana/web3.js");
        const tx = new Transaction().add(ix);
        tx.feePayer = payer.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const sig = await connection.sendTransaction(tx, [payer]);
        await connection.confirmTransaction(sig);

        console.log("\n✅ Token account created!");
        console.log("Transaction:", sig);
        console.log("ATA:", ata.toBase58());

    } catch (error: any) {
        console.error("\n❌ ERROR:", error.message);
    }
}

const targetWallet = process.argv[2];

if (!targetWallet) {
    console.log("Usage: tsx scripts/create-token-account.ts <TARGET_WALLET_ADDRESS>");
    console.log("\nThis will create an associated token account for the target wallet");
    console.log("so it can receive the custom SPL token.");
    process.exit(1);
}

createTokenAccount(targetWallet);
