import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_FILE_PATH = path.resolve(process.cwd(), "../../data/markets.json");

export async function GET() {
    try {
        const fileContent = await fs.readFile(DATA_FILE_PATH, "utf-8");
        const data = JSON.parse(fileContent);

        // Filter for settled markets
        const settledMarkets = data.markets.filter((m: any) => m.settled);

        return NextResponse.json({ settlements: settledMarkets });
    } catch (error) {
        return NextResponse.json({ settlements: [] });
    }
}
