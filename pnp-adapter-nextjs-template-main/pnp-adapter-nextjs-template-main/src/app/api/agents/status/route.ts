import { NextResponse } from "next/server";

export async function GET() {
    // In a real system, this would check a Redis key or heartbeat file
    // For this hackathon demo, we simulate active agents if the server is running
    const now = Date.now();

    return NextResponse.json({
        marketAgent: {
            status: "running",
            lastAction: now - 1000 * 30, // 30s ago
            marketsCreated: 12 // Mock count
        },
        oracleAgent: {
            status: "running",
            pendingSettlements: 2,
            lastSettlement: now - 1000 * 60 * 15 // 15 mins ago
        },
        liquidityAgent: {
            status: "running",
            lastActivation: now - 1000 * 45 // 45s ago
        }
    });
}
