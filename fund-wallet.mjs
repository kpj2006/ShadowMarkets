// Fund wallet with SOL and mint PNP tokens
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, mintTo, TOKEN_2022_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

const RPC = "https://devnet.helius-rpc.com/?api-key=6e8a3b52-2fce-44d4-9d4e-c2f84bcf2624";
const COLLATERAL_MINT = new PublicKey("CynN8io5GiG4RGutAscXYKLdx56zJsP3dL8fmy4EYpmW");

// Wallet that needs funding (from PNP_PRIVATE_KEY)
const TARGET_WALLET = new PublicKey("BfjsShgBWb4nXDx9QXMvjeL6y9Yt3dJdJC6nSMaVXYST");

// Private key of the signer (same one)
const signerKey = [12,250,148,176,69,91,230,161,245,82,76,125,146,120,80,210,135,49,244,227,227,3,145,49,199,6,59,107,0,108,219,232,158,129,105,182,161,25,190,93,209,254,242,247,111,106,116,86,32,225,36,253,76,100,187,27,188,207,236,48,224,70,171,176];
const signer = Keypair.fromSecretKey(Uint8Array.from(signerKey));

async function main() {
    const connection = new Connection(RPC, "confirmed");
    
    console.log("=== Funding Wallet ===");
    console.log("Target:", TARGET_WALLET.toBase58());
    console.log("Signer:", signer.publicKey.toBase58());
    
    // Step 1: Airdrop SOL
    console.log("\n1. Requesting SOL airdrop...");
    try {
        const sig = await connection.requestAirdrop(TARGET_WALLET, 2 * LAMPORTS_PER_SOL);
        console.log("   Airdrop requested:", sig);
        await connection.confirmTransaction(sig);
        console.log("   ✅ Airdrop confirmed!");
    } catch (e) {
        console.log("   ⚠️ Airdrop failed (may already have SOL or rate limited):", e.message);
    }
    
    // Check SOL balance
    const solBalance = await connection.getBalance(TARGET_WALLET);
    console.log("   SOL Balance:", solBalance / LAMPORTS_PER_SOL, "SOL");
    
    // Step 2: Create token account and mint PNP tokens
    console.log("\n2. Creating token account and minting PNP...");
    try {
        // Get or create ATA
        const ata = await getOrCreateAssociatedTokenAccount(
            connection,
            signer,
            COLLATERAL_MINT,
            TARGET_WALLET,
            false,
            undefined,
            undefined,
            TOKEN_2022_PROGRAM_ID
        );
        console.log("   Token Account:", ata.address.toBase58());
        
        // Mint 1000 tokens (1000 * 10^6 = 1000000000 base units)
        const mintAmount = 1000_000_000n; // 1000 tokens with 6 decimals
        const mintSig = await mintTo(
            connection,
            signer,
            COLLATERAL_MINT,
            ata.address,
            signer, // mint authority
            mintAmount,
            [],
            undefined,
            TOKEN_2022_PROGRAM_ID
        );
        console.log("   Mint TX:", mintSig);
        console.log("   ✅ Minted 1000 PNP tokens!");
    } catch (e) {
        console.log("   ❌ Token minting failed:", e.message);
        console.log("   (You may not have mint authority for this token)");
    }
    
    console.log("\n=== Done ===");
}

main().catch(console.error);
