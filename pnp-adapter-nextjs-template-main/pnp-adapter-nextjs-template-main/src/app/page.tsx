"use client";

import { useState } from "react";
import { useSolanaWallet } from "@/hooks";
import { Header } from "@/components/Header";
import { WalletInfo } from "@/components/WalletInfo";
import { CreateMarketV2Form } from "@/components/CreateMarketV2Form";
import { CreateMarketV3Form } from "@/components/CreateMarketV3Form";
import { MarketQuery } from "@/components/MarketQuery";
import { MarketTrade } from "@/components/MarketTrade";
import { RedeemPosition } from "@/components/RedeemPosition";
import { AgentMonitor } from "@/components/AgentMonitor";
import { MarketsDashboard } from "@/components/MarketsDashboard";
import { SettlementHistory } from "@/components/SettlementHistory";

type Tab = "dashboard" | "query" | "trade" | "redeem" | "create-v2" | "create-v3";

export default function Home() {
  const { isConnected } = useSolanaWallet();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");

  const handleTrade = (marketAddress: string, side: "yes" | "no") => {
    setSelectedMarket(marketAddress);
    setSelectedSide(side);
    setActiveTab("trade");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "query", label: "Query" },
    { id: "trade", label: "Trade" },
    { id: "redeem", label: "Redeem" },
    { id: "create-v2", label: "Create V2" },
    { id: "create-v3", label: "Create V3" },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
                ? "bg-primary text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" ? (
          <div className="space-y-8">
            <AgentMonitor />
            <MarketsDashboard onTrade={handleTrade} />
            <SettlementHistory />
          </div>
        ) : !isConnected ? (
          <div className="card text-center py-16">
            <h2 className="text-2xl font-bold mb-4">Wallet Connection Required</h2>
            <p className="text-zinc-400 mb-6">
              Connect your wallet to {activeTab.replace("-", " ")}
            </p>
            <p className="text-zinc-500 text-sm">
              Click &quot;Connect Wallet&quot; in the header to get started
            </p>
          </div>
        ) : (
          <>
            <WalletInfo />
            {activeTab === "query" && <MarketQuery />}
            {activeTab === "trade" && (
              <MarketTrade
                initialMarketAddress={selectedMarket}
                initialSide={selectedSide}
              />
            )}
            {activeTab === "redeem" && <RedeemPosition />}
            {activeTab === "create-v2" && <CreateMarketV2Form />}
            {activeTab === "create-v3" && <CreateMarketV3Form />}
          </>
        )}
      </main>
    </div>
  );
}
