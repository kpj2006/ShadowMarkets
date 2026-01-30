
import { Connection, PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import {
    createPnpProgram,
    COMPUTE_UNITS,
    getAdmin
} from "pnp-adapter";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export async function redeemPositionV2Debug(
    connection: Connection,
    wallet: any,
    params: {
        marketAddress: string;
        marketCreatorAddress: string;
        yesTokenAddress: string;
        noTokenAddress: string;
    }
) {
    console.log("Starting Debug Redeem V2...");
    const { marketAddress, marketCreatorAddress, yesTokenAddress, noTokenAddress } = params;

    const user = new PublicKey(wallet.address);
    const marketPDA = new PublicKey(marketAddress);

    // Get REAL Program ID from market account owner
    const marketInfo = await connection.getAccountInfo(marketPDA);
    if (!marketInfo) throw new Error("Market account not found");
    const CORRECT_PROGRAM_ID = marketInfo.owner;
    console.log("Real Program ID:", CORRECT_PROGRAM_ID.toBase58());

    // Setup Program
    const pnpProgram = createPnpProgram(connection);
    let program: any = (pnpProgram as any).program || pnpProgram;
    console.log("SDK Program ID:", program.programId.toBase58());

    // Patch Program ID if mismatch
    if (!program.programId.equals(CORRECT_PROGRAM_ID)) {
        console.warn("Patching Program ID...");
        Object.defineProperty(program, 'programId', { value: CORRECT_PROGRAM_ID, writable: true, configurable: true });
        (program as any)._programId = CORRECT_PROGRAM_ID;
        console.log("Patched to:", program.programId.toBase58());
    }

    const marketCreator = new PublicKey(marketCreatorAddress);
    const yesTokenMint = new PublicKey(yesTokenAddress);
    const noTokenMint = new PublicKey(noTokenAddress);

    // Fetch Market
    const marketAccount = await program.account.market.fetch(marketPDA);
    const collateralTokenMint = marketAccount.collateralToken as PublicKey;
    const creatorFeeTreasury = marketAccount.creatorFeeTreasury as PublicKey;
    console.log("Collateral Mint:", collateralTokenMint.toBase58());

    // Check token program
    const collateralMintInfo = await connection.getAccountInfo(collateralTokenMint);
    if (!collateralMintInfo) throw new Error("Collateral mint not found");
    const isToken2022 = collateralMintInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
    const tokenProgram = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    console.log(`Token Program: ${isToken2022 ? "2022" : "SPL"}`);

    // Derive Vault
    const [vaultPDA] = PublicKey.findProgramAddressSync(
        [marketPDA.toBuffer(), tokenProgram.toBuffer(), collateralTokenMint.toBuffer()],
        program.programId
    );
    console.log("Vault:", vaultPDA.toBase58());

    const vaultInfo = await connection.getAccountInfo(vaultPDA);
    if (!vaultInfo) throw new Error("Vault not found");

    // Build Transaction
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNITS });
    const builder = program.methods.redeemPosition().accounts({
        buyer: user,
        market: marketPDA,
        admin: getAdmin(),
        marketCreator,
        creatorFeeTreasury,
        yesTokenMint,
        noTokenMint,
        collateralTokenMint,
        tokenProgram
    }).preInstructions([computeBudgetIx]);

    const txn = await builder.transaction();
    txn.feePayer = user;
    const { blockhash } = await connection.getLatestBlockhash();
    txn.recentBlockhash = blockhash;

    const signed = await wallet.signTransaction(txn);
    const signature = await connection.sendRawTransaction(signed.serialize());
    console.log("Sent:", signature);
    await connection.confirmTransaction(signature, "confirmed");
    return signature;
}
