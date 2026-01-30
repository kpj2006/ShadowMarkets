import { readFile, writeFile } from "node:fs/promises";
import type { CreatedMarketRecord } from "../agents/marketCreationAgent.js";

export type MarketsFile = {
  markets: CreatedMarketRecord[];
};

export async function loadMarkets(filePath: string): Promise<MarketsFile> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as MarketsFile;
    parsed.markets ??= [];
    return parsed;
  } catch {
    return { markets: [] };
  }
}

export async function saveMarkets(filePath: string, doc: MarketsFile): Promise<void> {
  await writeFile(filePath, JSON.stringify(doc, null, 2), "utf8");
}

export async function appendMarket(filePath: string, rec: CreatedMarketRecord): Promise<void> {
  const doc = await loadMarkets(filePath);
  doc.markets.push(rec);
  await saveMarkets(filePath, doc);
}

export async function markSettled(
  filePath: string,
  market: string,
  result: { yesWinner: boolean; reasoning: string; signature: string },
): Promise<void> {
  const doc = await loadMarkets(filePath);
  const idx = doc.markets.findIndex((m) => m.market === market);
  if (idx >= 0) {
    doc.markets[idx] = { ...doc.markets[idx], settled: true, result };
    await saveMarkets(filePath, doc);
  }
}

