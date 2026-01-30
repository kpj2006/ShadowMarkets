"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WalletContextProvider } from "./WalletContextProvider";
import { setNetwork } from "pnp-adapter";

// Ensure we are targeting Devnet Program ID
setNetwork("devnet");

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WalletContextProvider>
        {children}
      </WalletContextProvider>
    </QueryClientProvider>
  );
}
