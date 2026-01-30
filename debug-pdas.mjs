
import { Connection, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import { join } from "path";
import { getMarketData } from "./pnp-adapter-nextjs-template-main/pnp-adapter-nextjs-template-main/node_modules/pnp-adapter/dist/index.mjs";

const PROGRAM_ID = new PublicKey("pnpkv2qnh4bfpGvTugGDSEhvZC7DP4pVxTuDykV3BGz");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

const RPC_URL = "https://devnet.helius-rpc.com/?api-key=6e8a3b52-2fce-44d4-9d4e-c2f84bcf2624"; // Use real RPC

async function main() {
    console.log("Connecting to RPC...");
    const connection = new Connection(RPC_URL, "confirmed");
    const marketsData = JSON.parse(readFileSync(join(process.cwd(), "data/markets.json"), "utf8"));
    
    console.log(`Checking ${marketsData.markets.length} markets...`);
    
    // Check just the first few settled ones or the one user reported?
    // User reported "1 of 1" error.
    
    for (const m of marketsData.markets) {
        if (!m.settled) continue;
        // console.log(`Checking ${m.market}...`);
        
        try {
            const data = await getMarketData(connection, m.market);
            if (!data) {
                console.log(`  Market ${m.market} not found on chain.`);
                continue;
            }
            
            const account = data.marketAccount;
            const collateralMint = new PublicKey(account.collateralToken);
            const collateralMintInfo = await connection.getAccountInfo(collateralMint);
            const mintOwner = collateralMintInfo ? collateralMintInfo.owner.toBase58() : "Unknown";
            
            // console.log(`  Collateral Mint: ${collateralMint.toBase58()} (Owner: ${mintOwner})`);
            
            // Derive Vaults
             const [vaultSPL] = PublicKey.findProgramAddressSync(
                [
                    new PublicKey(m.market).toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    collateralMint.toBuffer()
                ],
                PROGRAM_ID
            );
            
            const [vault2022] = PublicKey.findProgramAddressSync(
                [
                    new PublicKey(m.market).toBuffer(),
                    TOKEN_2022_PROGRAM_ID.toBuffer(),
                    collateralMint.toBuffer()
                ],
                PROGRAM_ID
            );
            
            const balSPL = await connection.getTokenAccountBalance(vaultSPL).catch(() => null);
            const bal2022 = await connection.getTokenAccountBalance(vault2022).catch(() => null);

            // Logic Check
            const isSPL = mintOwner === TOKEN_PROGRAM_ID.toBase58();
            const is2022 = mintOwner === TOKEN_2022_PROGRAM_ID.toBase58();
            
            if (balSPL || bal2022) {
                 console.log(`\nMarket: ${m.market}`);
                 console.log(`  Collateral Mint: ${collateralMint.toBase58()} (Owner: ${mintOwner})`);
                 if (balSPL) console.log(`  [SPL] Vault: ${vaultSPL.toBase58()} | Balance: ${balSPL.value.uiAmount}`);
                 if (bal2022) console.log(`  [2022] Vault: ${vault2022.toBase58()} | Balance: ${bal2022.value.uiAmount}`);
                 
                 // Diagnosis
                 if (isSPL && !balSPL && bal2022) {
                     console.error("  CRITICAL: Mint is SPL, but Vault is Token-2022. Adapter will fail signing!");
                 }
            } else {
                 console.log(`  Market ${m.market}: Collateral Mint ${collateralMint.toBase58()} OK, but NO VAULTS FOUND.`);
            }

        } catch (e) {
            console.error(`  Error processing ${m.market}:`, e.message);
        }
    }
}

main();
