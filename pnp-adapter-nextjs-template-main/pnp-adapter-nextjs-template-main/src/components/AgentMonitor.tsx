import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

type AgentStatus = {
    status: "running" | "stopped" | "error";
    lastAction?: number;
    marketsCreated?: number;
    pendingSettlements?: number;
};

type SystemStatus = {
    marketAgent: AgentStatus;
    oracleAgent: AgentStatus;
    liquidityAgent: AgentStatus;
};

export function AgentMonitor() {
    const [status, setStatus] = useState<SystemStatus | null>(null);

    useEffect(() => {
        // Poll status every 5 seconds
        const interval = setInterval(() => {
            fetch("/api/agents/status")
                .then((res) => res.json())
                .then(setStatus)
                .catch(console.error);
        }, 5000);

        // Initial fetch
        fetch("/api/agents/status").then(res => res.json()).then(setStatus);

        return () => clearInterval(interval);
    }, []);

    if (!status) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Market Agent */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-zinc-300">Market Agent</h4>
                    <span className="flex items-center gap-1 text-xs text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Running
                    </span>
                </div>
                <p className="text-zinc-500 text-xs mb-1">Last Action</p>
                <p className="text-zinc-200 text-sm">
                    {status.marketAgent.lastAction
                        ? formatDistanceToNow(status.marketAgent.lastAction, { addSuffix: true })
                        : "Never"}
                </p>
                <div className="mt-2 text-xs text-zinc-500">
                    Markets Created: <span className="text-zinc-300">{status.marketAgent.marketsCreated}</span>
                </div>
            </div>

            {/* Liquidity Agent */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-zinc-300">Liquidity Agent</h4>
                    <span className="flex items-center gap-1 text-xs text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Running
                    </span>
                </div>
                <p className="text-zinc-500 text-xs mb-1">Last Helper Action</p>
                <p className="text-zinc-200 text-sm">
                    {status.liquidityAgent.lastAction
                        ? formatDistanceToNow(status.liquidityAgent.lastAction, { addSuffix: true })
                        : "Just now"}
                </p>
                <div className="mt-2 text-xs text-zinc-500">
                    Auto-Activation: <span className="text-green-400">Enabled</span>
                </div>
            </div>

            {/* Oracle Agent */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-zinc-300">Oracle Agent</h4>
                    <span className="flex items-center gap-1 text-xs text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Running
                    </span>
                </div>
                <p className="text-zinc-500 text-xs mb-1">Pending Settlements</p>
                <p className="text-zinc-200 text-sm">
                    {status.oracleAgent.pendingSettlements} markets
                </p>
                <div className="mt-2 text-xs text-zinc-500">
                    Settlement Mode: <span className="text-purple-400">LLM (GPT-4)</span>
                </div>
            </div>
        </div>
    );
}
