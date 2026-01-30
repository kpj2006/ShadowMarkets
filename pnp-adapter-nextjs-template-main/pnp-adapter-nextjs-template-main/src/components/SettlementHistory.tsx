import { useEffect, useState } from "react";
import { format } from "date-fns";

type Settlement = {
    market: string;
    question: string;
    result: {
        yesWinner: boolean;
        reasoning: string;
        signature: string;
    };
};

export function SettlementHistory() {
    const [settlements, setSettlements] = useState<Settlement[]>([]);

    useEffect(() => {
        fetch("/api/settlements")
            .then((res) => res.json())
            .then((data) => setSettlements(data.settlements))
            .catch(console.error);
    }, []);

    if (settlements.length === 0) {
        return (
            <div className="mt-8">
                <h3 className="text-xl font-bold text-zinc-100 mb-4">📜 Settlement History</h3>
                <p className="text-zinc-500 text-sm">No markets have been settled yet.</p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">📜 Settlement History</h3>
            <div className="space-y-4">
                {settlements.map((s) => (
                    <div key={s.market} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                            <h4 className="font-bold text-zinc-200">{s.question}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${s.result?.yesWinner ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                }`}>
                                Winner: {s.result ? (s.result.yesWinner ? "YES" : "NO") : "N/A"}
                            </span>
                        </div>

                        {s.result && (
                            <div className="bg-black/40 p-3 rounded border border-zinc-800 text-sm text-zinc-400 font-mono mb-2">
                                🤖 Reasoning: {s.result.reasoning}
                            </div>
                        )}

                        {s.result && (
                            <a
                                href={`https://solscan.io/tx/${s.result.signature}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                            >
                                View Settlement TX →
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
