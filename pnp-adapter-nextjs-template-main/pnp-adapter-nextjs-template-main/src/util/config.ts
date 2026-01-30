import { PublicKey } from "@solana/web3.js";
import { getCollateralMint } from "pnp-adapter";

export const COLLATERAL_MINT = process.env.NEXT_PUBLIC_COLLATERAL_MINT
    ? new PublicKey(process.env.NEXT_PUBLIC_COLLATERAL_MINT)
    : getCollateralMint();

export const COLLATERAL_DECIMALS = Number(process.env.NEXT_PUBLIC_COLLATERAL_DECIMALS || "6");

export const getCollateralLabel = () => {
    // Check for custom label first
    const customLabel = process.env.NEXT_PUBLIC_COLLATERAL_LABEL;
    if (customLabel) {
        return customLabel;
    }

    // Default to generic "Token" label
    return "Token";
};
