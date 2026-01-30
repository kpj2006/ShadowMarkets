import { PublicKey } from "@solana/web3.js";
import { getCollateralMint } from "pnp-adapter";

export const COLLATERAL_MINT = process.env.NEXT_PUBLIC_COLLATERAL_MINT
    ? new PublicKey(process.env.NEXT_PUBLIC_COLLATERAL_MINT)
    : getCollateralMint();

export const COLLATERAL_DECIMALS = Number(process.env.NEXT_PUBLIC_COLLATERAL_DECIMALS || "6");

export const getCollateralLabel = () => {
    const mint = process.env.NEXT_PUBLIC_COLLATERAL_MINT;
    if (mint && mint !== "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr") {
        return "SPL Token";
    }
    return "USDC";
};
