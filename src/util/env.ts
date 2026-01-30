import { config as dotenvConfig } from "dotenv";

dotenvConfig();

export type Env = {
  rpcUrl: string;
  pnpPrivateKey: string;
  oracleAddress?: string;
  collateralMint: string;
  collateralDecimals: number;
  initialLiquidityBaseUnits: bigint;
  seedTradeAmount: number;
  yesOddsBps?: number;
  marketDurationSeconds: number;
  github?: {
    token: string;
    owner: string;
    repo: string;
  };
  privateEventJsonPath: string;
  llm?: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
};

function mustGet(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function getNum(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${name}: ${v}`);
  return n;
}

function getBigint(name: string, fallback: bigint): bigint {
  const v = process.env[name];
  if (!v) return fallback;
  try {
    return BigInt(v);
  } catch {
    throw new Error(`Invalid bigint for ${name}: ${v}`);
  }
}

export function loadEnv(): Env {
  const rpcUrl = process.env.RPC_URL ?? "https://api.devnet.solana.com";

  // Support multiple env var names for private key (devnet compatibility)
  const pnpPrivateKey =
    process.env.PNP_PRIVATE_KEY ||
    process.env.DEVNET_PRIVATE_KEY ||
    process.env.TEST_PRIVATE_KEY ||
    mustGet("PNP_PRIVATE_KEY"); // Will throw if none found

  const githubToken = process.env.GITHUB_TOKEN;
  const githubOwner = process.env.GITHUB_OWNER;
  const githubRepo = process.env.GITHUB_REPO;

  const llmApiKey = process.env.LLM_API_KEY;
  const llmBaseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const llmModel = process.env.LLM_MODEL ?? "gpt-4o-mini";

  // Default devnet USDC mint (Circle's devnet USDC)
  const DEFAULT_DEVNET_USDC = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";
  const collateralMint = process.env.COLLATERAL_MINT || process.env.DEVNET_COLLATERAL_MINT || DEFAULT_DEVNET_USDC;

  return {
    rpcUrl,
    pnpPrivateKey,
    oracleAddress: process.env.ORACLE_ADDRESS || undefined,
    collateralMint,
    collateralDecimals: getNum("COLLATERAL_DECIMALS", 6),
    initialLiquidityBaseUnits: getBigint("INITIAL_LIQUIDITY_BASE_UNITS", 1_000_000n),
    seedTradeAmount: getNum("SEED_TRADE_AMOUNT", 1),
    yesOddsBps: process.env.YES_ODDS_BPS ? getNum("YES_ODDS_BPS", 5000) : undefined,
    marketDurationSeconds: getNum("MARKET_DURATION_SECONDS", 3600),
    github:
      githubToken && githubOwner && githubRepo
        ? { token: githubToken, owner: githubOwner, repo: githubRepo }
        : undefined,
    privateEventJsonPath: process.env.PRIVATE_EVENT_JSON_PATH ?? "./data/private-events.json",
    llm: llmApiKey ? { apiKey: llmApiKey, baseUrl: llmBaseUrl, model: llmModel } : undefined,
  };
}

