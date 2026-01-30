import { useEffect, useState } from "react";
import { format } from "date-fns";

type Market = {
    market: string;
    question: string;
    endTimeSeconds: number;
    event: {
        kind: string;
        issueNumber?: number;
    };
};

export function MarketsDashboard() {
    const [markets, setMarkets] = useState<Market[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) return <div className="text-zinc-500 text-center py-8">Loading markets...</div>;

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-zinc-100">🤖 AI-Generated Markets</h3>

            {markets.length === 0 ? (
                <div className="text-zinc-500 text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    No active markets found. Start the Market Agent to generate some!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {markets.map((m) => (
                        <div key={m.market} className="card hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded">
                                    {m.event.kind === "githubIssueWillClose" ? "GitHub" : "Custom"}
                                </span>
                                <span className="text-zinc-500 text-xs text-right">
                                    Ends {format(new Date(m.endTimeSeconds * 1000), "MMM d, HH:mm")}
                                </span>
                            </div>

                            <h4 className="font-bold text-lg mb-2">{m.question}</h4>

                            <div className="text-xs text-zinc-400 mb-4 font-mono truncate">
                                ID: {m.market}
                            </div>

                            <div className="flex gap-2 mt-auto">
                                {/* In a real app, this would link to the trading tab with pre-filled market */}
                                <button className="btn-primary flex-1 text-sm py-2">
                                    Trade YES
                                </button>
                                <button className="btn-secondary flex-1 text-sm py-2">
                                    Trade NO
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
