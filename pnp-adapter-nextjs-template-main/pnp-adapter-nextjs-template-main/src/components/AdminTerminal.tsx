import { useState } from "react";
import { CreateMarketV2Form } from "./CreateMarketV2Form";
import { CreateMarketV3Form } from "./CreateMarketV3Form";
import { AgentMonitor } from "./AgentMonitor";

export function AdminTerminal() {
    const [activeTab, setActiveTab] = useState<"monitor" | "create-v2" | "create-v3">("monitor");

    return (
        <div className="animate-in space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white font-mono flex items-center gap-2">
                        <span className="text-emerald-500">root@shadow</span>:~$
                    </h2>
                    <p className="text-zinc-500 text-sm font-mono mt-1">
                        System Control // Authorized Personnel Only
                    </p>
                </div>

                <div className="flex bg-zinc-900 border border-white/10 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab("monitor")}
                        className={`px-4 py-1.5 rounded text-xs font-mono transition-all ${activeTab === "monitor"
                                ? "bg-zinc-700 text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        ./monitor
                    </button>
                    <button
                        onClick={() => setActiveTab("create-v2")}
                        className={`px-4 py-1.5 rounded text-xs font-mono transition-all ${activeTab === "create-v2"
                                ? "bg-zinc-700 text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        ./create-v2
                    </button>
                    <button
                        onClick={() => setActiveTab("create-v3")}
                        className={`px-4 py-1.5 rounded text-xs font-mono transition-all ${activeTab === "create-v3"
                                ? "bg-zinc-700 text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        ./create-v3
                    </button>
                </div>
            </div>

            <div className="glass-panel p-1 min-h-[600px] border-zinc-800 bg-black/40">
                {activeTab === "monitor" && (
                    <div className="p-6">
                        <AgentMonitor />
                    </div>
                )}

                {activeTab === "create-v2" && (
                    <div className="p-6 max-w-2xl mx-auto">
                        <div className="mb-6 border-b border-white/10 pb-4">
                            <h3 className="text-lg font-mono text-emerald-400 mb-1">
                                [EXEC] Create Market V2
                            </h3>
                            <p className="text-xs text-zinc-500 font-mono">
                                Launch a new prediction market on the legacy protocol.
                            </p>
                        </div>
                        <CreateMarketV2Form />
                    </div>
                )}

                {activeTab === "create-v3" && (
                    <div className="p-6 max-w-2xl mx-auto">
                        <div className="mb-6 border-b border-white/10 pb-4">
                            <h3 className="text-lg font-mono text-purple-400 mb-1">
                                [EXEC] Create Market V3
                            </h3>
                            <p className="text-xs text-zinc-500 font-mono">
                                Launch an advanced prediction market with enhanced settlement logic.
                            </p>
                        </div>
                        <CreateMarketV3Form />
                    </div>
                )}
            </div>
        </div>
    );
}
