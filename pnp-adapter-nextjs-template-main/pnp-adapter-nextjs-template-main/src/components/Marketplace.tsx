import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useSolanaWallet } from "@/hooks";
import { getCollateralLabel } from "@/util/config";

type Market = {
    market: string;
    question: string;
    endTimeSeconds: number;
    event: {
        kind: string;
        issueNumber?: number;
    };
    yesPrice?: number;
    noPrice?: number;
};

interface MarketplaceProps {
    onTrade: (marketAddress: string, side: "yes" | "no") => void;
}

export function Marketplace({ onTrade }: MarketplaceProps) {
    const [markets, setMarkets] = useState<Market[]>([]);
    const [loading, setLoading] = useState(true);
    const { isConnected } = useSolanaWallet();
    const collateralLabel = getCollateralLabel();

    useEffect(() => {
        fetch("/api/markets")
            .then((res) => res.json())
            .then((data) => {
                setMarkets(data.markets);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load markets", err);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-zinc-400 animate-pulse">Scanning the matrix for predictions...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Live Predictions</h2>
                    <p className="text-zinc-400">Trade on the outcome of future AI events.</p>
                </div>
                <div className="bg-zinc-900/50 backdrop-blur border border-white/5 px-4 py-2 rounded-lg text-xs font-mono text-zinc-500">
                    {markets.length} Active Markets
                </div>
            </div>

            {markets.length === 0 ? (
                <div className="glass-panel p-12 text-center">
                    <div className="text-6xl mb-4">🤖</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Active Markets</h3>
                    <p className="text-zinc-400 mb-6">The AI agents are currently dormant. Check back soon!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {markets.map((m) => (
                        <div key={m.market} className="glass-panel hover:border-indigo-500/30 group relative overflow-hidden flex flex-col h-full">
                            {/* Decorative gradient glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-all duration-500"></div>

                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${m.event.kind === "githubIssueWillClose"
                                            ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                                            : "bg-indigo-900/30 border-indigo-500/30 text-indigo-300"
                                        }`}>
                                        {m.event.kind === "githubIssueWillClose" ? "GITHUB" : "CUSTOM"}
                                    </span>
                                    <div className="text-right">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Ends In</p>
                                        <p className="text-xs font-mono text-zinc-300">
                                            {format(new Date(m.endTimeSeconds * 1000), "MMM d, HH:mm")}
                                        </p>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-4 leading-tight min-h-[3.5rem]">
                                    {m.question}
                                </h3>

                                <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mb-6">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    Live Trading
                                </div>
                            </div>

                            <div className="p-4 bg-black/20 border-t border-white/5 mt-auto">
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => onTrade(m.market, "yes")}
                                        disabled={!isConnected}
                                        className="group/btn relative overflow-hidden bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/50 rounded-lg p-3 text-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <p className="text-xs text-emerald-300 mb-1 font-medium">Buy YES</p>
                                        <span className="absolute inset-0 bg-emerald-400/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></span>
                                    </button>
                                    <button
                                        onClick={() => onTrade(m.market, "no")}
                                        disabled={!isConnected}
                                        className="group/btn relative overflow-hidden bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 rounded-lg p-3 text-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <p className="text-xs text-red-300 mb-1 font-medium">Buy NO</p>
                                        <span className="absolute inset-0 bg-red-400/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></span>
                                    </button>
                                </div>
                                {!isConnected && (
                                    <p className="text-[10px] text-zinc-600 text-center mt-2">Connect wallet to trade</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
