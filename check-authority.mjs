// Check the mint authority of the PNP token
import { Connection, PublicKey } from "@solana/web3.js";
import { getMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

const RPC = "https://devnet.helius-rpc.com/?api-key=6e8a3b52-2fce-44d4-9d4e-c2f84bcf2624";
const COLLATERAL_MINT = new PublicKey("CynN8io5GiG4RGutAscXYKLdx56zJsP3dL8fmy4EYpmW");
const CURRENT_WALLET = new PublicKey("BfjsShgBWb4nXDx9QXMvjeL6y9Yt3dJdJC6nSMaVXYST");

async function main() {
    const connection = new Connection(RPC, "confirmed");
    
    console.log("=== PNP Token Info ===");
    console.log("Mint:", COLLATERAL_MINT.toBase58());
    
    const mintInfo = await getMint(connection, COLLATERAL_MINT, undefined, TOKEN_2022_PROGRAM_ID);
    
    console.log("\nMint Authority:", mintInfo.mintAuthority?.toBase58() || "NONE (frozen)");
    console.log("Freeze Authority:", mintInfo.freezeAuthority?.toBase58() || "NONE");
    console.log("Decimals:", mintInfo.decimals);
    console.log("Supply:", Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals));
    
    console.log("\n=== Authority Check ===");
    console.log("Current Wallet:", CURRENT_WALLET.toBase58());
    console.log("Is Mint Authority:", mintInfo.mintAuthority?.equals(CURRENT_WALLET));
    
    if (!mintInfo.mintAuthority?.equals(CURRENT_WALLET)) {
        console.log("\n⚠️ Your wallet is NOT the mint authority!");
        console.log("The mint authority wallet is:", mintInfo.mintAuthority?.toBase58());
        console.log("You need to use THAT wallet's private key as PNP_PRIVATE_KEY");
    }
}

main().catch(console.error);
