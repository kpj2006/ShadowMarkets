import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { marketId, outcome } = await request.json();

    if (!marketId || !outcome) {
      return NextResponse.json(
        { error: 'Missing marketId or outcome' },
        { status: 400 }
      );
    }

    if (outcome !== 'yes' && outcome !== 'no') {
      return NextResponse.json(
        { error: 'Outcome must be "yes" or "no"' },
        { status: 400 }
      );
    }

    // Read markets.json
    const marketsPath = path.join(process.cwd(), '..', '..', 'data', 'markets.json');
    const marketsData = JSON.parse(fs.readFileSync(marketsPath, 'utf-8'));

    // Find the market
    const marketIndex = marketsData.markets.findIndex(
      (m: any) => m.market === marketId
    );

    if (marketIndex === -1) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Check if already settled
    if (marketsData.markets[marketIndex].settled) {
      return NextResponse.json(
        { error: 'Market already settled' },
        { status: 400 }
      );
    }

    // Update the market with settlement data
    marketsData.markets[marketIndex].settled = true;
    marketsData.markets[marketIndex].result = {
      yesWinner: outcome === 'yes',
      reasoning: `Manual settlement: ${outcome.toUpperCase()} outcome selected`,
      signature: generateFakeSignature()
    };

    // Write back to markets.json
    fs.writeFileSync(marketsPath, JSON.stringify(marketsData, null, 2));

    return NextResponse.json({
      success: true,
      market: marketsData.markets[marketIndex]
    });

  } catch (error) {
    console.error('Settlement error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

// Generate a random signature-like string
function generateFakeSignature(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 88; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
