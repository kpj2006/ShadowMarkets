# ShadowMarkets 

## What this builds

## Key Features

- **Private Evidence Sources**: Markets created from private data only accessible to the oracle (GitHub repos, Discord channels, local data)
- **Custom Oracle Markets**: Full control over market settlement using PNP SDK's custom oracle flow
- **Automated Agents**: Market creation, liquidity seeding, and settlement run autonomously
- **LLM-Powered Decisions**: Oracle uses AI to analyze evidence and determine YES/NO outcomes
- **Bonding Curve Trading**: No orderbook needed - instant trades via AMM pricing


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

**Option A: Create Your Own Token**
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
3. Start the agents (see below)

## Run (agents)

### Start Market Agents

**For GitHub Markets:**
```bash
npm run run:github-market-agent
```

Then create markets by **opening issues** in your monitored GitHub repo. Each new issue automatically triggers market creation.

**For Discord Markets:**
```bash
npm run run:discord-market-agent
```

Then create markets in Discord using:
```
!predict <your prediction statement>
```
Example: `!predict The price of SOL will reach $200 by end of week`

### Start Oracle Agent

```bash
npm run run:oracle-agent
```

This continuously monitors markets and settles them after deadline using LLM-powered evidence analysis.

### Settle market (after end time)

**Option 1: Manual Settlement UI (Recommended)**

For quick manual settlement via browser:

```
http://localhost:3000/settle/{MARKET_ID}
```

This opens a minimal UI with YES/NO buttons to instantly settle any market without SDK errors.

**Option 2: CLI Script**

```bash
MARKET_ADDRESS=... npm run settle-market
```
