import { PNPClient } from "pnp-sdk";
import { PublicKey } from "@solana/web3.js";

export type PnpConfig = {
  rpcUrl: string;
  privateKey: string;
};

export function makePnpClient(cfg: PnpConfig): PNPClient {
  const secretKey = PNPClient.parseSecretKey(cfg.privateKey);
  return new PNPClient(cfg.rpcUrl, secretKey);
}

/**
 * Hackathon wrapper to satisfy "createMarketsWithCustomOracle()".
 * The PNP docs currently show `createMarketWithCustomOracle()` (singular),
 * so this helper supports both 1 or many questions and calls the SDK method.
 */
export async function createMarketsWithCustomOracle(
  client: PNPClient,
  params: {
    questions: string[] | string;
    initialLiquidity: bigint;
    endTime: bigint;
    collateralMint: PublicKey;
    settlerAddress: PublicKey;
    yesOddsBps?: number;
  },
): Promise<Array<{ market: PublicKey; signature: string }>> {
  const qs = Array.isArray(params.questions) ? params.questions : [params.questions];
  const out: Array<{ market: PublicKey; signature: string }> = [];

  for (const question of qs) {
    const res = await client.createMarketV2WithCustomOdds({
      question,
      initialLiquidity: params.initialLiquidity,
      endTime: params.endTime,
      collateralTokenMint: params.collateralMint,
      oracle: params.settlerAddress,
      yesOddsBps: params.yesOddsBps || 5000, // Default to 50% if undefined
    });
    out.push({ market: new PublicKey(res.market), signature: res.signature });
  }

  return out;
}

