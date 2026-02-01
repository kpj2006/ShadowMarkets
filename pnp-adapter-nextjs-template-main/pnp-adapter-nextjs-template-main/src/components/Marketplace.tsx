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
        <div className="space-y-12 animate-in-delayed time-300">
            <div className="flex justify-between items-end border-b border-white/5 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-widest font-display mb-2">LIVE_PREDICTIONS</h2>
                    <p className="text-phantom font-mono-tech text-xs">Querying distributed consensus...</p>
                </div>
                <div className="bg-white/5 backdrop-blur px-3 py-1 text-[10px] font-mono-tech text-phantom border border-white/5">
                    MARKETS_ACTIVE: {markets.length.toString().padStart(2, '0')}
                </div>
            </div>

            {markets.length === 0 ? (
                <div className="glass-panel p-20 text-center border-t border-b border-white/10">
                    <div className="text-6xl mb-6 opacity-20 filter grayscale">👁️</div>
                    <h3 className="text-lg font-bold text-white mb-2 font-display tracking-wider">NO_SIGNALS_DETECTED</h3>
                    <p className="text-phantom font-mono-tech text-xs">The network is silent. Awaiting new data streams.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {markets.map((m) => (
                        <div key={m.market} className="group relative bg-black border border-white/10 hover:border-white/20 transition-all duration-500 flex flex-col h-full hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]">
                            {/* Monolith Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="p-8 flex-1 relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <span className="text-[10px] font-mono-tech px-2 py-1 bg-white/5 text-phantom border border-white/10">
                                        {m.event.kind === "githubIssueWillClose"
                                            ? "SRC::GITHUB"
                                            : m.event.kind === "discordPrediction"
                                                ? "SRC::DISCORD"
                                                : "SRC::CUSTOM"}
                                    </span>
                                    <div className="text-right">
                                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">TERMINATION</p>
                                        <p className="text-xs font-mono-tech text-zinc-400">
                                            {format(new Date(m.endTimeSeconds * 1000), "yyyy.MM.dd HH:mm")}
                                        </p>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-6 leading-snug min-h-[3.5rem] font-display">
                                    {m.question}
                                </h3>

                                <div className="flex items-center gap-2 text-[10px] text-signal-win font-mono-tech mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-signal-win animate-pulse"></div>
                                    SIGNAL_ACTIVE
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/5 bg-zinc-950/30 relative z-10">
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => onTrade(m.market, "yes")}
                                        disabled={!isConnected}
                                        className="relative overflow-hidden group/btn bg-transparent border border-signal-win/30 hover:border-signal-win/80 hover:bg-signal-win/5 px-4 py-3 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <span className="text-xs font-base text-signal-win tracking-wider">LONG_YES</span>
                                    </button>
                                    <button
                                        onClick={() => onTrade(m.market, "no")}
                                        disabled={!isConnected}
                                        className="relative overflow-hidden group/btn bg-transparent border border-signal-loss/30 hover:border-signal-loss/80 hover:bg-signal-loss/5 px-4 py-3 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <span className="text-xs font-base text-signal-loss tracking-wider">SHORT_NO</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
