import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import fs from "fs";

const RPC = "https://devnet.helius-rpc.com/?api-key=6e8a3b52-2fce-44d4-9d4e-c2f84bcf2624";

async function main() {
    const connection = new Connection(RPC);
    const results = [];
    
    const customMint = new PublicKey("CynN8io5GiG4RGutAscXYKLdx56zJsP3dL8fmy4EYpmW");
    const customInfo = await connection.getAccountInfo(customMint);
    
    results.push("=== Custom Mint ===");
    results.push("Mint: " + customMint.toBase58());
    results.push("Owner: " + (customInfo?.owner.toBase58() || "NOT FOUND"));
    results.push("Is Token-2022: " + customInfo?.owner.equals(TOKEN_2022_PROGRAM_ID));
    
    const market = new PublicKey("98cqrdffu6CcxrnvHHBqaDPkXLQ3uVcQASUGGtL6UHU2");
    const marketInfo = await connection.getAccountInfo(market);
    const marketCollateral = new PublicKey(marketInfo.data.slice(40, 72));
    const marketColInfo = await connection.getAccountInfo(marketCollateral);
    
    results.push("");
    results.push("=== Market Collateral ===");
    results.push("Mint: " + marketCollateral.toBase58());
    results.push("Owner: " + (marketColInfo?.owner.toBase58() || "NOT FOUND"));
    results.push("Mints Match: " + customMint.equals(marketCollateral));
    
    // Derive vaults with both programs
    const vault_spl = getAssociatedTokenAddressSync(marketCollateral, market, true, TOKEN_PROGRAM_ID);
    const vault_2022 = getAssociatedTokenAddressSync(marketCollateral, market, true, TOKEN_2022_PROGRAM_ID);
    
    const spl_exists = await connection.getAccountInfo(vault_spl);
    const t2022_exists = await connection.getAccountInfo(vault_2022);
    
    results.push("");
    results.push("=== Vault Check ===");
    results.push("SPL Vault: " + vault_spl.toBase58() + " exists=" + !!spl_exists);
    results.push("2022 Vault: " + vault_2022.toBase58() + " exists=" + !!t2022_exists);
    
    // Write to file
    fs.writeFileSync("mint-analysis.txt", results.join("\n"));
    console.log("Results written to mint-analysis.txt");
}

main().catch(e => { console.error(e); fs.writeFileSync("mint-analysis.txt", "Error: " + e.message); });
