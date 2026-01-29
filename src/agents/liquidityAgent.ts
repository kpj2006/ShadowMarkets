import { PublicKey } from "@solana/web3.js";
import type { PNPClient } from "pnp-sdk";

export class LiquidityAgent {
  constructor(private readonly client: PNPClient) {}

  /**
   * Custom oracle markets must be activated within ~15 minutes or they become unresolvable.
   * This call enables trading and then places a small initial buy to seed activity.
   */
  async enableTradingAndSeed(market: PublicKey, seedUsdc: number): Promise<{ enableSig: string; tradeSig: string }> {
    const enableRes = await this.client.setMarketResolvable(market, true);

    if (!this.client.trading) {
      throw new Error("PNPClient.trading is undefined (missing signer/private key?)");
    }

    const buyRes = await this.client.trading.buyTokensUsdc({
      market,
      buyYesToken: true,
      amountUsdc: seedUsdc,
    });

    return { enableSig: enableRes.signature, tradeSig: buyRes.signature };
  }
}

