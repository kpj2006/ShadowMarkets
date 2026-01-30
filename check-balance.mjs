// Check wallet balance
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

const RPC = "https://devnet.helius-rpc.com/?api-key=6e8a3b52-2fce-44d4-9d4e-c2f84bcf2624";
const COLLATERAL_MINT = "CynN8io5GiG4RGutAscXYKLdx56zJsP3dL8fmy4EYpmW";

// Parse the private key from env format
const keyArray = [12,250,148,176,69,91,230,161,245,82,76,125,146,120,80,210,135,49,244,227,227,3,145,49,199,6,59,107,0,108,219,232,158,129,105,182,161,25,190,93,209,254,242,247,111,106,116,86,32,225,36,253,76,100,187,27,188,207,236,48,224,70,171,176];

const keypair = Keypair.fromSecretKey(Uint8Array.from(keyArray));
console.log("Wallet Address:", keypair.publicKey.toBase58());

async function main() {
    const connection = new Connection(RPC);
    
    // Check SOL balance
    const solBalance = await connection.getBalance(keypair.publicKey);
    console.log("SOL Balance:", solBalance / 1e9, "SOL");
    
    // Check collateral token balance (Token-2022)
    const mint = new PublicKey(COLLATERAL_MINT);
    const ata = getAssociatedTokenAddressSync(mint, keypair.publicKey, false, TOKEN_2022_PROGRAM_ID);
    console.log("Collateral ATA:", ata.toBase58());
    
    try {
        const tokenAccount = await getAccount(connection, ata, undefined, TOKEN_2022_PROGRAM_ID);
        console.log("Collateral Balance:", Number(tokenAccount.amount) / 1e6, "tokens");
    } catch (e) {
        console.log("Collateral Token Account: NOT FOUND or no balance");
    }
}

main().catch(console.error);
