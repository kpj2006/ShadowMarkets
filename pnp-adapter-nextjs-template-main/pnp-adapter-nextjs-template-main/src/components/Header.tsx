"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

export function Header() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-void/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 group cursor-default">
          <div className="w-2 h-2 bg-signal-win rounded-full animate-pulse group-hover:shadow-[0_0_10px_#22d3ee] transition-shadow"></div>
          <h1 className="text-sm font-bold tracking-[0.2em] text-white">SHADOW_MARKETS_AI</h1>
        </div>

        {mounted && (
          <div className="opacity-80 hover:opacity-100 transition-opacity">
            <WalletMultiButton style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'inherit', height: '36px', fontSize: '14px' }} />
          </div>
        )}
      </div>
    </header>
  );
}
