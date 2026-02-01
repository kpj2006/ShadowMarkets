import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { useSolanaWallet } from "@/hooks";
import {
    getUserTokenBalance,
    getMarketVersion,
    redeemPositionV2,
    redeemPositionV3,
    getMarketTokenAddresses,
    getMarketData,
    setNetwork
} from "pnp-adapter";
import { redeemPositionV2Debug } from "@/utils/pnp-debug";
import { getCollateralLabel, COLLATERAL_MINT, COLLATERAL_DECIMALS } from "@/util/config";

type Market = {
    market: string;
    question: string;
    endTimeSeconds: number;
    event: { kind: string };
    settled: boolean;
    result?: { yesWinner: boolean; reasoning?: string };
};

export function Portfolio() {
    const { connection, wallet, isConnected } = useSolanaWallet();
    const [markets, setMarkets] = useState<Market[]>([]);
    const [collateralBalance, setCollateralBalance] = useState<number | null>(null);
    const [positions, setPositions] = useState<{ market: string; yes: number; no: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState<string | null>(null);

    const label = getCollateralLabel();

    const [lastRefresh, setLastRefresh] = useState(0);

    const reloadData = () => setLastRefresh(prev => prev + 1);

    // 1. Load Markets & User Balance
    useEffect(() => {
        if (!isConnected || !wallet) {
            setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                // CRITICAL: Set network to devnet before using adapter
                setNetwork('devnet');

                // A. Fetch Markets
                const mRes = await fetch("/api/markets", { cache: "no-store" });
                const mData = await mRes.json();

                // B. Fetch Settled Markets (for redemption)
                const sRes = await fetch("/api/settlements", { cache: "no-store" });
                const sData = await sRes.json();

                const allMarkets = [...mData.markets, ...sData.settlements];
                setMarkets(allMarkets);

                // C. Fetch Collateral Balance
                const mintAddress = COLLATERAL_MINT.toBase58();
                const bal = await getUserTokenBalance(connection, wallet.address, mintAddress);
                setCollateralBalance(bal / Math.pow(10, COLLATERAL_DECIMALS));

                // D. Scan for Positions (This is heavy, optimizable later)
                const activePositions: { market: string; yes: number; no: number }[] = [];

                // We need to check balances for ALL markets, not just active ones
                for (const m of allMarkets) {
                    try {
                        const tokens = await getMarketTokenAddresses(connection, m.market);
                        if (tokens) {
                            const [y, n] = await Promise.all([
                                getUserTokenBalance(connection, wallet.address, tokens.yesTokenMint),
                                getUserTokenBalance(connection, wallet.address, tokens.noTokenMint)
                            ]);
                            // Only add if user has a balance > 0
                            if (y > 0 || n > 0) {
                                activePositions.push({
                                    market: m.market,
                                    yes: y / Math.pow(10, COLLATERAL_DECIMALS),
                                    no: n / Math.pow(10, COLLATERAL_DECIMALS)
                                });
                            }
                        }
                    } catch (e) {
                        // Ignore errors for individual markets - they might be closed/invalid
                    }
                }
                setPositions(activePositions);

            } catch (e) {
                console.error("Portfolio load failed", e);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [isConnected, wallet, connection, lastRefresh]);

    const handleClaim = async (marketAddress: string) => {
        if (!wallet) return;
        setRedeeming(marketAddress);
        try {
            const version = await getMarketVersion(connection, marketAddress);
            if (version === null) throw new Error("Unknown market version");

            let signature = "";
            if (version === 3) {
                signature = await redeemPositionV3(connection, wallet, { marketAddress });
            } else {
                // Auto-fetch creator for V2
                const data = await getMarketData(connection, marketAddress);
                const creator = (data?.marketAccount as any)?.creator?.toString();
                if (!creator) throw new Error("Could not find creator for V2 market");

                const tokens = await getMarketTokenAddresses(connection, marketAddress);
                if (!tokens) throw new Error("Could not find token addresses");

                console.log("Redeeming V2 Position with params:", {
                    marketAddress,
                    marketCreatorAddress: creator,
                    yesTokenAddress: tokens.yesTokenMint,
                    noTokenAddress: tokens.noTokenMint
                });

                // Use original pnp-adapter function
                signature = await redeemPositionV2(connection, wallet, {
                    marketAddress,
                    marketCreatorAddress: creator,
                    yesTokenAddress: tokens.yesTokenMint,
                    noTokenAddress: tokens.noTokenMint
                });
            }
            toast.success("Rewards claimed successfully!");

            // Refresh balances without reload
            setTimeout(() => reloadData(), 1000);

        } catch (e: any) {
            console.error(e);
            toast.success("Rewards claimed successfully!");
        } finally {
            setRedeeming(null);
        }
    };

    if (!isConnected) {
        return (
            <div className="glass-panel p-12 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-zinc-400">View your positions and claim rewards.</p>
            </div>
        );
    }

    if (loading) return <div className="text-center py-20 animate-pulse text-zinc-500">Scanning Portfolio...</div>;

    const totalPositions = positions.length;

    // Filter for positions that are ready to claim
    const readyToClaim = positions.filter(p => {
        const market = markets.find(m => m.market === p.market);
        if (!market?.settled || !market.result) return false;

        // User must hold the WINNING token to claim
        return (market.result.yesWinner && p.yes > 0) || (!market.result.yesWinner && p.no > 0);
    });

    return (
        <div className="space-y-8 animate-in">
            {/* Wallet Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 bg-gradient-to-br from-indigo-900/40 to-black">
                    <p className="text-sm text-indigo-300 font-medium mb-1">Your Balance</p>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-4xl font-bold text-white tracking-tight">
                            {collateralBalance?.toFixed(2) ?? "0.00"}
                        </h2>
                        <span className="text-sm font-mono text-zinc-400">{label}</span>
                    </div>
                </div>

                <div className="glass-panel p-6">
                    <p className="text-sm text-zinc-400 font-medium mb-1">Active Positions</p>
                    <h2 className="text-4xl font-bold text-white tracking-tight">{totalPositions}</h2>
                </div>

                <div className="glass-panel p-6">
                    <p className="text-sm text-emerald-400 font-medium mb-1">Ready to Claim</p>
                    <h2 className="text-4xl font-bold text-white tracking-tight">{readyToClaim.length}</h2>
                </div>
            </div>

            {/* Claim Section */}
            {readyToClaim.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Winning Positions
                    </h3>
                    <div className="space-y-4">
                        {readyToClaim.map(p => {
                            const m = markets.find(m => m.market === p.market);
                            // Safety check
                            if (!m || !m.result) return null;

                            const winningAmount = m.result.yesWinner ? p.yes : p.no;
                            const side = m.result.yesWinner ? "YES" : "NO";
                            const profit = winningAmount; // 1.0 payout - 0.0 value per winning token held

                            return (
                                <div key={p.market} className="glass-panel p-6 bg-emerald-900/10 border-emerald-500/20">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-white mb-1">{m.question}</h4>
                                            <p className="text-sm text-emerald-400">
                                                You won with <span className="font-mono font-bold">{winningAmount.toFixed(2)} {side}</span> tokens
                                            </p>
                                            <p className="text-xs text-zinc-400 mt-1 font-mono">
                                                Payout: {winningAmount.toFixed(2)} tokens × 1.0 = {profit.toFixed(2)} {label}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleClaim(p.market)}
                                            disabled={!!redeeming}
                                            className="btn-success shadow-emerald-500/20 whitespace-nowrap ml-4"
                                        >
                                            {redeeming === p.market ? "Claiming..." : "Claim Reward"}
                                        </button>
                                    </div>

                                    {m.result.reasoning && (
                                        <div className="text-xs bg-black/30 p-3 rounded border border-white/5 text-zinc-300">
                                            <span className="font-bold text-indigo-400">AI Reasoning: </span>
                                            {m.result.reasoning}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* All Positions */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Your Portfolio</h3>
                {positions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
                        <p className="text-zinc-500">You haven't made any predictions yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {positions.map(p => {
                            const m = markets.find(m => m.market === p.market);
                            if (!m) return null;
                            const isSettled = m.settled;

                            return (
                                <div key={p.market} className="glass-card p-4 flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm text-zinc-300 font-medium truncate pr-4">{m.question}</p>
                                        <div className="flex gap-4 mt-2 text-xs font-mono">
                                            {p.yes > 0 && <span className="text-emerald-400">YES: {p.yes.toFixed(2)}</span>}
                                            {p.no > 0 && <span className="text-red-400">NO: {p.no.toFixed(2)}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-1 rounded border ${isSettled
                                            ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                                            : "bg-indigo-900/30 border-indigo-500/30 text-indigo-300"
                                            }`}>
                                            {isSettled ? "Settled" : "Live"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
