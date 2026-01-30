"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

export function Header() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold">
            P
          </div>
          <h1 className="text-xl font-bold">ShadowMarkets AI</h1>
        </div>

        {mounted && <WalletMultiButton className="!bg-primary hover:!bg-primary/90" />}
      </div>
    </header>
  );
}
