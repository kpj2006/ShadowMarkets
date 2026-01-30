"use client";

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import type { Wallet } from "pnp-adapter";

export function useSolanaWallet() {
  const { connection } = useConnection();
  const { wallet: adapterWallet, publicKey, signTransaction, connected, connecting } = useWallet();

  const sdkWallet: Wallet | null = useMemo(() => {
    if (!publicKey || !signTransaction) return null;

    return {
      address: publicKey.toBase58(),
      signTransaction: async (tx: Transaction): Promise<Transaction> => {
        try {
          console.log("Signing transaction with wallet:", adapterWallet?.adapter.name);
          return await signTransaction(tx);
        } catch (error: any) {
          console.error("Wallet sign error:", error);
          throw error;
        }
      },
    };
  }, [publicKey, signTransaction, adapterWallet]);

  return {
    connection,
    wallet: sdkWallet,
    address: publicKey?.toBase58() || null,
    isConnected: connected && !!publicKey,
    isLoading: connecting,
    walletType: adapterWallet?.adapter.name.toLowerCase() || null,
  };
}
