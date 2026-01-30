# Local Development Setup Guide

This guide explains how to run the PNP AI Prediction Markets project locally.

## Prerequisites

- Node.js v18+ 
- npm or yarn
- Git
- A Solana devnet wallet with SOL and PNP tokens

---

## Project Structure

```
pnpai/
├── pnp-adapter-nextjs-template-main/   # Frontend (Next.js)
├── scripts/                             # Backend scripts
├── src/                                 # Backend source
├── data/                                # Market data storage
└── .env                                 # Backend environment config
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/kpj2006/pnpai.git
cd pnpai
```

---

## 2. Backend Setup

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create a `.env` file in the root directory:

```env
# Solana RPC URL (use Helius for better rate limits)
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY

# Custom Collateral Token (Token-2022)
NEXT_PUBLIC_COLLATERAL_MINT=CynN8io5GiG4RGutAscXYKLdx56zJsP3dL8fmy4EYpmW
NEXT_PUBLIC_COLLATERAL_DECIMALS=6
NEXT_PUBLIC_COLLATERAL_LABEL=PNP

# Wallet private key for signing transactions (base58 OR JSON array)
PNP_PRIVATE_KEY=[1,2,3,...,64]  # Your 64-byte secret key array
```

### Run Backend Scripts

```bash
# Create a new market
npm run create-market

# Check market data
npm run check-markets
```

---

## 3. Frontend Setup

### Navigate to Frontend

```bash
cd pnp-adapter-nextjs-template-main/pnp-adapter-nextjs-template-main
```

### Install Dependencies

```bash
npm install
```

### Configure Frontend Environment

Create a `.env` file in the frontend directory:

```env
# Solana RPC
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY

# Collateral Token Configuration
NEXT_PUBLIC_COLLATERAL_MINT=CynN8io5GiG4RGutAscXYKLdx56zJsP3dL8fmy4EYpmW
NEXT_PUBLIC_COLLATERAL_DECIMALS=6
NEXT_PUBLIC_COLLATERAL_LABEL=PNP
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Get Devnet Tokens

### Airdrop SOL (Command Line)

```bash
# Using WSL or Solana CLI
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

### Get PNP Tokens

Contact the token mint authority to receive PNP tokens, or use the fund-wallet script if you have mint authority:

```bash
node fund-wallet.mjs
```

---

## 5. Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend dev server |
| `npm run create-market` | Create a new prediction market |
| `npm run check-markets` | List all markets |
| `node check-balance.mjs` | Check wallet balances |
| `node fund-wallet.mjs` | Fund wallet with tokens (requires mint authority) |

---

## Environment Variables Reference

### Backend (.env in root)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana RPC endpoint | Yes |
| `NEXT_PUBLIC_COLLATERAL_MINT` | Custom token mint address | Yes |
| `NEXT_PUBLIC_COLLATERAL_DECIMALS` | Token decimals (usually 6) | Yes |
| `NEXT_PUBLIC_COLLATERAL_LABEL` | Token display name | Yes |
| `PNP_PRIVATE_KEY` | Wallet private key (JSON array or base58) | Yes (for scripts) |

### Frontend (.env in frontend dir)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana RPC endpoint | Yes |
| `NEXT_PUBLIC_COLLATERAL_MINT` | Custom token mint address | Yes |
| `NEXT_PUBLIC_COLLATERAL_DECIMALS` | Token decimals | Yes |
| `NEXT_PUBLIC_COLLATERAL_LABEL` | Token display name | Yes |

---

## Troubleshooting

### "Simulation failed" on Claim

This usually means:
- The market's vault doesn't exist on-chain
- Network mismatch (mainnet vs devnet)

**Solution:** Ensure `setNetwork('devnet')` is called before any pnp-adapter operations.

### RPC Timeout

If you get timeout errors, try:
1. Check internet connection
2. Use a different RPC provider
3. Check [Solana Status](https://status.solana.com/)

### Missing Private Key

```
Error: Missing required env var: PNP_PRIVATE_KEY
```

Add your wallet's private key to `.env` as a JSON array:
```env
PNP_PRIVATE_KEY=[12,250,148,...]
```

---

## Network Configuration

The project uses **Solana Devnet** by default. Make sure:
1. Your wallet is connected to devnet
2. RPC URL points to devnet
3. You have devnet SOL and tokens

---

## Support

For issues, check the GitHub repository or contact the maintainers.
