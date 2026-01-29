# ShadowMarkets AI (PNP Hackathon)

Backend-only hackathon project that **autonomously creates and settles private prediction markets** on Solana devnet using the **PNP SDK custom oracle flow**.

Docs used:
- PNP SDK: `https://docs.pnp.exchange/pnp-sdk`
- Core features (bonding curve / no orderbook): `https://docs.pnp.exchange/core-features#—no-off-chain-orderbook`
- Devnet Developer Guide: `https://gist.github.com/proxima424/748c145d4603dcfa6e08a2abc69ae89c`
- Devnet Examples: `https://gist.github.com/parth-soni07/fec3770a60574eaf781b89217061875e`

## What this builds

- **Market Creation Agent**: watches a “private” event source (GitHub private repo API *or* local mock JSON), generates a prediction question, and creates a **custom-oracle market** via `createMarketWithCustomOracle()` (wrapped as `createMarketsWithCustomOracle()` in this repo for the hackathon requirement).
- **Liquidity Agent**: immediately enables trading (within the **15 minute buffer**) and places a small initial trade using `client.trading.buyTokensUsdc()` to seed activity.
- **Oracle Agent**: waits until `endTime`, collects evidence, uses an LLM to decide **YES/NO**, then settles via `client.settleMarket()`.

## Privacy approach (hackathon-friendly)

This repo supports **two privacy modes**:

- **Private data source (recommended)**: read signals from a **private GitHub repo** via `GITHUB_TOKEN` (only the oracle/agent has access). Traders only see the on-chain question; the underlying evidence remains off-chain/private until settlement.
- **Mock private API**: store private signals locally in `data/private-events.json` (simulates DAO metrics, private KPIs, internal incident metrics, etc.).

Collateral “privacy-focused SPL token” is left as optional (you can swap `COLLATERAL_MINT` to a Token-2022 mint you control). For hackathon minimalism, we focus privacy on **data source + oracle control**.

## Repo layout

```
scripts/
  create-market.ts
  seed-liquidity.ts
  settle-market.ts
  run-market-agent.ts
  run-oracle-agent.ts
src/
  pnp/pnpClient.ts
  agents/marketCreationAgent.ts
  agents/liquidityAgent.ts
  agents/oracleAgent.ts
  sources/eventSource.ts
  sources/githubPrivateSource.ts
  sources/localPrivateSource.ts
  llm/llm.ts
  llm/openaiCompatible.ts
  util/env.ts
  util/time.ts
data/
  private-events.json
```

## Setup

1. Install deps

```bash
npm install
```

2. Create `.env`

```bash
cp .env.example .env
```

Fill:
- `RPC_URL=https://api.devnet.solana.com`
- `PNP_PRIVATE_KEY=...` (base58 or JSON array string)
  - Also accepts: `DEVNET_PRIVATE_KEY` or `TEST_PRIVATE_KEY`

**Option A: Create Your Own Token (Recommended for Hackathons)**
```bash
# Mint 10M tokens for testing (no external faucet needed!)
npm run mint-token

# This creates a token and saves the mint address to data/token-mint.json
# Then add to .env:
# COLLATERAL_MINT=<mint_address_from_output>
# COLLATERAL_DECIMALS=6
```

**Option B: Use Devnet USDC**
- `COLLATERAL_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` (Circle's devnet USDC)
- Get tokens from: https://faucet.circle.com/

**Critical Devnet Requirements:**

⚠️ **On devnet, you MUST call `setMarketResolvable(true)` after creating a market to enable trading!**

- On **mainnet**: PNP's AI oracle automatically sets markets as resolvable
- On **devnet**: No oracle watching → **YOU must activate markets manually**
- Our `seed-liquidity` script handles this automatically (calls `setMarketResolvable(true)` + places initial trade)

**Devnet Setup Notes:**
- Get devnet SOL: `solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet`
- You must **hold collateral tokens** in your wallet (enough for `INITIAL_LIQUIDITY_BASE_UNITS` + seed trade)
- Default devnet USDC: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` (Circle's devnet faucet)
- Devnet Program ID: `pnpkv2qnh4bfpGvTugGDSEhvZC7DP4pVxTuDykV3BGz`

Optional:
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` for private GitHub mode
- `LLM_API_KEY` for LLM-based oracle decisions

## Run (scripts)

### Mint Your Own Token (Recommended First Step)

```bash
npm run mint-token
```

This creates a new SPL token and mints 10 million tokens to your wallet. Perfect for hackathon testing - no external faucets needed!

**What it does:**
- Creates a new SPL token mint
- Creates a token account for your wallet
- Mints 10M tokens (configurable via `MINT_AMOUNT_UI` env var)
- Saves token info to `data/token-mint.json`

**After minting:**
1. Copy the mint address from the output
2. Add to `.env`: `COLLATERAL_MINT=<mint_address>`
3. Run `npm run create-market`

### Create a market

```bash
npm run create-market
```

Outputs a `market` public key. Save it (or export `MARKET_ADDRESS`).

### Seed liquidity (enable trading + small buy)

**⚠️ CRITICAL on devnet**: This script calls `setMarketResolvable(true)` to activate the market (required for trading).

```bash
MARKET_ADDRESS=... npm run seed-liquidity
```

**What happens:**
1. Calls `client.setMarketResolvable(market, true)` ← **Required on devnet!**
2. Places a small initial buy to seed liquidity
3. Market is now tradeable

### Settle market (after end time)

```bash
MARKET_ADDRESS=... npm run settle-market
```

## Run (agents)

### Market creation agent (continuous)

```bash
npm run run:market-agent
```

### Oracle agent (continuous)

```bash
npm run run:oracle-agent
```

## Devnet vs Mainnet

| Feature | Devnet | Mainnet |
|---------|--------|---------|
| **Set Resolvable** | **Manual** (you call `setMarketResolvable(true)`) | Automatic (AI oracle) |
| **Program ID** | `pnpkv2qnh4bfpGvTugGDSEhvZC7DP4pVxTuDykV3BGz` | `6fnYZUSyp3vJxTNnayq5S62d363EFaGARnqYux5bqrxb` |
| **Default USDC** | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| **Settlement** | Manual (your oracle agent) | AI oracle resolution |
| **Tokens** | No value (testnet) | Real value |

**Why this matters for hackathons:**
- On devnet, markets start with `resolvable = false` → **you must activate them**
- Our `seed-liquidity` script handles this automatically
- Custom oracle markets still require `setMarketResolvable(true)` within 15 minutes

## Architecture diagram

```text
          (private evidence)
   ┌──────────────────────────┐
   │ GitHub Private Repo OR    │
   │ Local Private JSON        │
   └─────────────┬────────────┘
                 │
        ┌────────▼─────────┐
        │ Market Agent      │
        │ - generate Q      │
        │ - create market   │
        └────────┬─────────┘
                 │ on-chain
   ┌─────────────▼─────────────┐
   │ PNP (Solana Devnet)        │
   │ - custom oracle market     │
   │ - bonding curve trading    │
   └─────────────┬─────────────┘
                 │
        ┌────────▼─────────┐
        │ Liquidity Agent   │
        │ - setResolvable   │
        │ - seed trade      │
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │ Oracle Agent      │
        │ - wait endTime    │
        │ - collect evidence│
        │ - LLM YES/NO      │
        │ - settleMarket    │
        └──────────────────┘
```

