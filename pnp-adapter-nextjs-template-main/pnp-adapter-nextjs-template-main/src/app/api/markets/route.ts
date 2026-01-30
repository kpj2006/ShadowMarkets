import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Path to backend data file (adjusts for dev/prod relative paths)
const DATA_FILE_PATH = path.resolve(process.cwd(), "../../data/markets.json");

export async function GET() {
    try {
        const fileContent = await fs.readFile(DATA_FILE_PATH, "utf-8");
        const data = JSON.parse(fileContent);

        // Filter for active markets (not settled and not ended)
        const now = Math.floor(Date.now() / 1000);
        const activeMarkets = data.markets.filter(
            (m: any) => !m.settled && m.endTimeSeconds > now
        );

        return NextResponse.json({ markets: activeMarkets });
    } catch (error) {
        console.warn("Could not read markets.json, returning empty list", error);
        // Return empty list if file doesn't exist yet (app just started)
        return NextResponse.json({ markets: [] });
    }
}
