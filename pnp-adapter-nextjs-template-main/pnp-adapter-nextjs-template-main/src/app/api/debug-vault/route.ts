// API endpoint where user submits signed transaction, backend uses pnp-sdk
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PublicKey, Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { marketAddress, signedTx } = body;

        if (!marketAddress) {
            return NextResponse.json({ error: "Market address required" }, { status: 400 });
        }

        // For now, just return the vault derivation info for debugging
        const connection = new Connection(RPC_URL, "confirmed");
        const marketPk = new PublicKey(marketAddress);

        // Fetch market data
        const marketInfo = await connection.getAccountInfo(marketPk);
        if (!marketInfo) {
            return NextResponse.json({ error: "Market not found" }, { status: 404 });
        }

        // Parse collateral mint from market data (offset 40 based on earlier analysis)
        const collateralMint = new PublicKey(marketInfo.data.slice(40, 72));
        const mintInfo = await connection.getAccountInfo(collateralMint);

        const isToken2022 = mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) || false;
        const tokenProgram = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

        // Derive vault using ATA (Associated Token Address)
        const vault = getAssociatedTokenAddressSync(
            collateralMint,
            marketPk,
            true, // allowOwnerOffCurve for PDA
            tokenProgram
        );

        const vaultInfo = await connection.getAccountInfo(vault);

        return NextResponse.json({
            debug: {
                market: marketPk.toBase58(),
                collateralMint: collateralMint.toBase58(),
                isToken2022,
                tokenProgram: tokenProgram.toBase58(),
                derivedVault: vault.toBase58(),
                vaultExists: !!vaultInfo,
                vaultBalance: vaultInfo ? "exists" : "not found"
            }
        });
    } catch (error: any) {
        console.error("Redeem API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
