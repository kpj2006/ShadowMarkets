import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

const RPC = "https://devnet.helius-rpc.com/?api-key=6e8a3b52-2fce-44d4-9d4e-c2f84bcf2624";
const PROGRAM_ID = new PublicKey("pnpkv2qnh4bfpGvTugGDSEhvZC7DP4pVxTuDykV3BGz");

// Most recent settled market
const MARKET = "98cqrdffu6CcxrnvHHBqaDPkXLQ3uVcQASUGGtL6UHU2";

async function main() {
    const connection = new Connection(RPC);
    const marketPDA = new PublicKey(MARKET);
    
    console.log("Market:", MARKET);
    
    const marketInfo = await connection.getAccountInfo(marketPDA);
    const data = marketInfo.data;
    
    // Try to find collateral at different offsets
    for (let offset of [40, 72, 104, 136]) {
        const pk = new PublicKey(data.slice(offset, offset + 32));
        const info = await connection.getAccountInfo(pk);
        if (info) {
            console.log(`Offset ${offset}: ${pk.toBase58()}`);
            console.log(`  Owner: ${info.owner.toBase58()}`);
            console.log(`  Is Token-2022: ${info.owner.equals(TOKEN_2022_PROGRAM_ID)}`);
        }
    }
    
    // Your custom mint
    const customMint = new PublicKey("CynN8io5GiG4RGutAscXYKLdx56zJsP3dL8fmy4EYpmW");
    const customInfo = await connection.getAccountInfo(customMint);
    console.log("\nYour Custom Mint:", customMint.toBase58());
    console.log("Owner:", customInfo?.owner.toBase58());
    
    // Check both vault PDAs
    const collateral = new PublicKey(data.slice(40, 72)); // Try offset 40
    console.log("\nTrying collateral at offset 40:", collateral.toBase58());
    
    const [vaultSPL] = PublicKey.findProgramAddressSync(
        [marketPDA.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), collateral.toBuffer()],
        PROGRAM_ID
    );
    const [vault2022] = PublicKey.findProgramAddressSync(
        [marketPDA.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), collateral.toBuffer()],
        PROGRAM_ID
    );
    
    const splInfo = await connection.getAccountInfo(vaultSPL);
    const t2022Info = await connection.getAccountInfo(vault2022);
    
    console.log("SPL Vault:", vaultSPL.toBase58(), "exists:", !!splInfo);
    console.log("2022 Vault:", vault2022.toBase58(), "exists:", !!t2022Info);
}

main().catch(console.error);
