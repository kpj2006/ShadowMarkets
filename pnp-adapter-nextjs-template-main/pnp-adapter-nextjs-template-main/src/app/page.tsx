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
    <div className="min-h-screen bg-void relative overflow-hidden pt-20">
      <Header />

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full animate-fog-flow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full animate-fog-flow" style={{ animationDelay: "-10s" }} />
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">

        {/* Hero Section - 3D Hologram Construct */}
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center mb-24 animate-in relative perspective-1000">

          {/* Volumetric Light Beams (God Rays) */}
          <div className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[200%] h-[200%] bg-gradient-to-b from-signal-win/10 via-transparent to-transparent blur-[100px] pointer-events-none transform rotate-45 mix-blend-screen" />

          <div className="relative transform-style-3d animate-float-3d group hover:scale-105 transition-transform duration-700">
            {/* Layer 1: Deep Extrusion Shadow - Back */}
            <h2 className="text-6xl md:text-9xl font-black tracking-tighter text-zinc-900 absolute top-0 left-1/2 -translate-x-1/2 translate-z-[-50px] opacity-80 blur-[2px] select-none">
              SHADOW
            </h2>

            {/* Layer 2: Main Title Front */}
            <h2 className="text-6xl md:text-9xl font-black tracking-tighter text-zinc-100 mb-2 font-display relative z-10 text-extruded transition-all duration-500 group-hover:text-white">
              SHADOW
            </h2>

            {/* Layer 3: Floating Wireframe */}
            <h2 className="text-5xl md:text-8xl font-black tracking-[0.2em] text-transparent text-outline absolute top-[60%] left-1/2 -translate-x-1/2 translate-z-[50px] w-full pointer-events-none mix-blend-overlay opacity-90 animate-pulse">
              MARKETS
            </h2>

            {/* Layer 4: AI Construct */}
            <div className="absolute top-[-20%] right-[-15%] md:right-[-10%] translate-z-[100px] rotate-12 group-hover:rotate-0 transition-transform duration-500">
              <span className="text-5xl md:text-8xl font-mono-tech font-bold text-signal-win hologram-text drop-shadow-[0_0_20px_#22d3ee]">
                _AI
              </span>
            </div>
          </div>

          <p className="text-phantom max-w-xl mx-auto text-lg tracking-wide uppercase text-xs font-mono-tech opacity-60 mt-20 relative z-0 border-t border-white/10 pt-4">
            <span className="text-signal-win animate-pulse">///</span> SYSTEM PROTOCOL: <span className="text-white">ONLINE</span>
          </p>
        </div>

        {/* Navigation - Command Bar */}
        <div className="flex justify-center mb-12 animate-in-delayed">
          <div className="glass-panel px-2 py-2 flex gap-2 border-b border-white/10 rounded-none bg-black/60 backdrop-blur-md">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-8 py-3 font-mono-tech text-xs tracking-widest uppercase transition-all duration-300 relative group ${activeTab === tab.id
                  ? "text-black bg-white"
                  : "text-phantom hover:text-white hover:bg-white/5"
                  }`}
              >
                {tab.label}
                {/* Active Indicator */}
                {activeTab === tab.id && (
                  <div className="absolute -bottom-2 left-0 right-0 h-[1px] bg-white shadow-[0_0_10px_white]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[600px] animate-in" style={{ animationDelay: "0.3s" }}>
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

      {/* Trade Slide-over Panel - Monolith Style */}
      {showTradePanel && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setShowTradePanel(false)}
          ></div>
          <div className="relative w-full max-w-md bg-zinc-950 border-l border-white/10 shadow-2xl h-full overflow-y-auto animate-in-right">
            <div className="p-8">
              <button
                onClick={() => setShowTradePanel(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
              <h3 className="text-2xl font-bold text-white mb-2 font-display tracking-widest uppercase">Execute</h3>
              <div className="h-px w-12 bg-signal-win mb-8"></div>
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
