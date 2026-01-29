import { PublicKey } from "@solana/web3.js";
import type { PNPClient } from "pnp-sdk";
import type { EventSource, PrivateEvent } from "../sources/eventSource.js";
import { createMarketsWithCustomOracle } from "../pnp/pnpClient.js";
import { nowSeconds } from "../util/time.js";

export type CreatedMarketRecord = {
  market: string;
  signature: string;
  createdAtSeconds: number;
  endTimeSeconds: number;
  question: string;
  event: PrivateEvent;
  settled?: boolean;
};

export class MarketCreationAgent {
  constructor(
    private readonly client: PNPClient,
    private readonly eventSource: EventSource,
    private readonly cfg: {
      collateralMint: PublicKey;
      initialLiquidityBaseUnits: bigint;
      oraclePubkey: PublicKey;
      yesOddsBps?: number;
    },
  ) {}

  async createNextMarket(marketDurationSeconds: number): Promise<CreatedMarketRecord | null> {
    const event = await this.eventSource.nextEvent();
    if (!event) return null;

    const effectiveEnd = event.endTimeSeconds > nowSeconds() ? event.endTimeSeconds : nowSeconds() + marketDurationSeconds;
    const endTime = BigInt(effectiveEnd);
    const [created] = await createMarketsWithCustomOracle(this.client, {
      questions: event.question,
      initialLiquidity: this.cfg.initialLiquidityBaseUnits,
      endTime,
      collateralMint: this.cfg.collateralMint,
      settlerAddress: this.cfg.oraclePubkey,
      yesOddsBps: this.cfg.yesOddsBps,
    });

    return {
      market: created.market.toBase58(),
      signature: created.signature,
      createdAtSeconds: nowSeconds(),
      endTimeSeconds: effectiveEnd,
      question: event.question,
      event: { ...event, endTimeSeconds: effectiveEnd },
    };
  }
}

