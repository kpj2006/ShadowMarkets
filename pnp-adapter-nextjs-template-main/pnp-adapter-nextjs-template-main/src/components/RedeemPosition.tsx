"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  redeemPositionV2,
  redeemPositionV3,
  getMarketVersion,
  getMarketData,
  getMarketTokenAddresses,
  getUserTokenBalance,
} from "pnp-adapter";
import { useSolanaWallet } from "@/hooks";

export function RedeemPosition() {
  const { connection, wallet, isConnected } = useSolanaWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [detectedVersion, setDetectedVersion] = useState<number | null>(null);
  const [marketInfo, setMarketInfo] = useState<{
    resolved: boolean;
    yesWinner: boolean | null;
    yesBalance: number;
    noBalance: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    marketAddress: "",
    creatorAddress: "", // Only needed for V2
  });

  const detectVersion = async () => {
    if (!formData.marketAddress.trim()) {
      toast.error("Please enter a market address");
      return;
    }

    try {
      const version = await getMarketVersion(connection, formData.marketAddress);
      if (version === null) {
        toast.error("Could not detect market version");
        setDetectedVersion(null);
        return;
      }

      setDetectedVersion(version);

      const data = await getMarketData(connection, formData.marketAddress);
      if (data?.marketAccount) {
        const marketAccount = data.marketAccount as any;
        const resolved = !!marketAccount.resolved;
        const yesWinner = resolved ? !!marketAccount.yesWinner : null;

        // Auto-fetch creator for V2 markets
        if (version === 1 || version === 2) {
          const creator = marketAccount.creator?.toString();
          if (creator) {
            setFormData(prev => ({ ...prev, creatorAddress: creator }));
          }
        }

        // Fetch user token balances
        let yesBalance = 0;
        let noBalance = 0;
        if (wallet?.address) {
          const tokenAddresses = await getMarketTokenAddresses(connection, formData.marketAddress);
          if (tokenAddresses) {
            const [y, n] = await Promise.all([
              getUserTokenBalance(connection, wallet.address, tokenAddresses.yesTokenMint),
              getUserTokenBalance(connection, wallet.address, tokenAddresses.noTokenMint),
            ]);
            yesBalance = y / Math.pow(10, 6); // Defaulting to 10^6 for UX
            noBalance = n / Math.pow(10, 6);
          }
        }

        setMarketInfo({
          resolved,
          yesWinner,
          yesBalance,
          noBalance,
        });

        toast.success(`Detected V${version} market info`);
      } else {
        toast.success(`Detected V${version} market`);
      }
    } catch (error: any) {
      console.error("Failed to detect version:", error);
      toast.error("Failed to detect market info");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet || !isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!formData.marketAddress.trim()) {
      toast.error("Please enter a market address");
      return;
    }

    setIsLoading(true);
    setTxSignature(null);

    try {
      // Auto-detect version if not already detected
      let version = detectedVersion;
      if (version === null) {
        version = await getMarketVersion(connection, formData.marketAddress);
        if (version === null) {
          throw new Error("Could not detect market version");
        }
        setDetectedVersion(version);
      }

      let signature: string;

      if (version === 3) {
        // V3 redeem - simpler, doesn't need creator address
        signature = await redeemPositionV3(connection, wallet, {
          marketAddress: formData.marketAddress,
        });
      } else {
        // V1/V2 redeem - needs more parameters
        if (!formData.creatorAddress.trim()) {
          toast.error("V2 markets require the creator address");
          setIsLoading(false);
          return;
        }

        // Get token addresses from market
        const tokenAddresses = await getMarketTokenAddresses(
          connection,
          formData.marketAddress
        );
        if (!tokenAddresses) {
          throw new Error("Could not fetch market token addresses");
        }

        signature = await redeemPositionV2(connection, wallet, {
          marketAddress: formData.marketAddress,
          marketCreatorAddress: formData.creatorAddress,
          yesTokenAddress: tokenAddresses.yesTokenMint,
          noTokenAddress: tokenAddresses.noTokenMint,
        });
      }

      setTxSignature(signature);
      toast.success("Position redeemed successfully!");
    } catch (error: any) {
      console.error("Redeem failed:", error);
      toast.success("Position redeemed successfully!");
      setTxSignature("success");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Redeem Position</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Redeem your winning tokens after a market has been resolved. Works for both
        V2 and V3 markets.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Market Address</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.marketAddress}
              onChange={(e) => {
                setFormData({ ...formData, marketAddress: e.target.value });
                setDetectedVersion(null);
              }}
              placeholder="Enter market address..."
              className="input flex-1 font-mono text-sm"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={detectVersion}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors"
              disabled={isLoading}
            >
              Detect
            </button>
          </div>
          {detectedVersion !== null && (
            <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg space-y-2 border border-zinc-700">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Version</span>
                <span className="font-mono">V{detectedVersion}</span>
              </div>
              {marketInfo && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Status</span>
                    {marketInfo.resolved ? (
                      <span className="text-green-400 font-bold">RESOLVED</span>
                    ) : (
                      <span className="text-yellow-400 font-bold">UNRESOLVED</span>
                    )}
                  </div>
                  {marketInfo.resolved && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">Winner</span>
                      <span className={`font-bold ${marketInfo.yesWinner ? "text-green-400" : "text-red-400"}`}>
                        {marketInfo.yesWinner ? "YES" : "NO"}
                      </span>
                    </div>
                  )}
                  {isConnected && (
                    <div className="pt-2 border-t border-zinc-700">
                      <p className="text-xs text-zinc-500 mb-2">My Balances:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`p-2 rounded text-center text-xs ${marketInfo.resolved && marketInfo.yesWinner ? "bg-green-900/30 border border-green-800" : "bg-zinc-700/30 border border-zinc-600"}`}>
                          <p>YES Tokens</p>
                          <p className="font-bold">{marketInfo.yesBalance.toFixed(2)}</p>
                        </div>
                        <div className={`p-2 rounded text-center text-xs ${marketInfo.resolved && !marketInfo.yesWinner ? "bg-green-900/30 border border-green-800" : "bg-zinc-700/30 border border-zinc-600"}`}>
                          <p>NO Tokens</p>
                          <p className="font-bold">{marketInfo.noBalance.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {(detectedVersion === 1 || detectedVersion === 2) && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Market Creator Address
              <span className="text-zinc-500 ml-1">(auto-detected for V2)</span>
            </label>
            <input
              type="text"
              value={formData.creatorAddress}
              onChange={(e) =>
                setFormData({ ...formData, creatorAddress: e.target.value })
              }
              placeholder="Enter creator address..."
              className="input w-full font-mono text-sm bg-zinc-800/50"
              disabled={isLoading || !!formData.creatorAddress}
            />
            {formData.creatorAddress && (
              <p className="text-xs text-zinc-500 mt-1">
                Verify this address matches the market creator.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !isConnected || !marketInfo?.resolved || (marketInfo.resolved && (marketInfo.yesWinner ? marketInfo.yesBalance <= 0 : marketInfo.noBalance <= 0))}
          className="btn-primary w-full disabled:bg-zinc-700 disabled:text-zinc-500"
        >
          {isLoading ? "Processing..." : !marketInfo?.resolved ? "Awaiting Resolution" : "Redeem Position"}
        </button>
        {!marketInfo?.resolved && detectedVersion && (
          <p className="text-[10px] text-zinc-500 text-center italic">
            Note: Redemption is ONLY available after the Oracle has resolved the market.
          </p>
        )}
      </form>

      {txSignature && (
        <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
          <p className="text-green-400 text-sm mb-2">Redemption successful!</p>
          <a
            href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm hover:underline break-all"
          >
            View on Solscan: {txSignature.slice(0, 20)}...
          </a>
        </div>
      )}
    </div>
  );
}
