"use client";

import { useState } from "react";
import { useSolanaWallet } from "@/hooks";
import { Header } from "@/components/Header";
import { WalletInfo } from "@/components/WalletInfo";
import { Marketplace } from "@/components/Marketplace";
import { Portfolio } from "@/components/Portfolio";
import { AdminTerminal } from "@/components/AdminTerminal";
import { MarketTrade } from "@/components/MarketTrade";

type Tab = "marketplace" | "portfolio" | "admin";

export default function Home() {
  const { isConnected } = useSolanaWallet();
  const [activeTab, setActiveTab] = useState<Tab>("marketplace");
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");
  const [showTradePanel, setShowTradePanel] = useState(false);

  const handleTrade = (marketAddress: string, side: "yes" | "no") => {
    setSelectedMarket(marketAddress);
    setSelectedSide(side);
    setShowTradePanel(true);
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "marketplace", label: "Marketplace", icon: "🌐" },
    { id: "portfolio", label: "My Rewards", icon: "🎁" },
    { id: "admin", label: "Terminal", icon: "🤖" },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="glass-panel p-1 flex gap-1 rounded-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[600px]">
          {activeTab === "marketplace" && (
            <Marketplace onTrade={handleTrade} />
          )}

          {activeTab === "portfolio" && (
            <Portfolio />
          )}

          {activeTab === "admin" && (
            <AdminTerminal />
          )}
        </div>
      </main>

      {/* Trade Slide-over Panel */}
      {showTradePanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowTradePanel(false)}
          ></div>
          <div className="relative w-full max-w-md bg-zinc-900 border-l border-white/10 shadow-2xl h-full overflow-y-auto animate-in-right">
            <div className="p-6">
              <button
                onClick={() => setShowTradePanel(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              >
                ✕
              </button>
              <h3 className="text-xl font-bold text-white mb-6">Execute Trade</h3>
              <MarketTrade
                initialMarketAddress={selectedMarket}
                initialSide={selectedSide}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
