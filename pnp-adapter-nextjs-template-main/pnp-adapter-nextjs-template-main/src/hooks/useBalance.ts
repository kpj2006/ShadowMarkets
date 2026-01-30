"use client";

import { useQuery } from "@tanstack/react-query";
import { COLLATERAL_MINT, COLLATERAL_DECIMALS } from "@/util/config";
import { getUserTokenBalance } from "pnp-adapter";
import { useSolanaWallet } from "./useSolanaWallet";

export function useBalance() {
  const { connection, address, isConnected } = useSolanaWallet();

  return useQuery({
    queryKey: ["balance", address],
    queryFn: async () => {
      if (!address) return 0;
      try {
        const balanceBaseUnits = await getUserTokenBalance(connection, address, COLLATERAL_MINT.toBase58());
        return balanceBaseUnits / Math.pow(10, COLLATERAL_DECIMALS);
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        return 0;
      }
    },
    enabled: isConnected && !!address,
    refetchInterval: 30000,
  });
}
