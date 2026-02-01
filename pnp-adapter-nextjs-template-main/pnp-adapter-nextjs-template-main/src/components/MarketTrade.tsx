"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  mintYesTokenV2,
  mintNoTokenV2,
  burnYesTokenV2,
  burnNoTokenV2,
  buyYesTokenV3,
  buyNoTokenV3,
  getMarketVersion,
  getMarketData,
  getPrice,
  getMarketTokenAddresses,
  getUserTokenBalance,
} from "pnp-adapter";
import { useSolanaWallet, useBalance, useBirdeye, getKnownToken, type TokenInfo } from "@/hooks";
import { COLLATERAL_DECIMALS, getCollateralLabel } from "@/util/config";
import { useQueryClient } from "@tanstack/react-query";

type TradeAction = "buy" | "sell";
type TokenSide = "yes" | "no";

interface MarketTradeProps {
  initialMarketAddress?: string;
  initialSide?: "yes" | "no";
}

export function MarketTrade({ initialMarketAddress = "", initialSide = "yes" }: MarketTradeProps) {
  const { connection, wallet, isConnected } = useSolanaWallet();
  const queryClient = useQueryClient();
  const { data: usdcBalance } = useBalance();
  const { getTokenInfo } = useBirdeye();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const [marketAddress, setMarketAddress] = useState(initialMarketAddress);
  const [amount, setAmount] = useState("1");
  const [action, setAction] = useState<TradeAction>("buy");
  const [side, setSide] = useState<TokenSide>(initialSide);

  // Auto-fetch if initialMarketAddress is provided
  useEffect(() => {
    if (initialMarketAddress) {
      fetchMarketInfo();
    }
  }, [initialMarketAddress]);

  // Market info
  const [marketInfo, setMarketInfo] = useState<{
    version: number | null;
    yesPrice: number;
    noPrice: number;
    creator: string;
    collateralToken: string;
    reserves: number;
    endTime: number;
    resolved: boolean;
  } | null>(null);

  // Collateral token info from Birdeye
  const [collateralInfo, setCollateralInfo] = useState<TokenInfo | null>(null);

  // User's YES/NO token balances (for V2 sell)
  const [userTokenBalances, setUserTokenBalances] = useState<{
    yesBalance: number;
    noBalance: number;
    yesTokenMint: string;
    noTokenMint: string;
  } | null>(null);

  // Helper to fetch user token balances
  const fetchUserTokenBalances = useCallback(async () => {
    if (!marketAddress || !wallet?.address || !marketInfo) {
      return;
    }

    try {
      const tokenAddresses = await getMarketTokenAddresses(connection, marketAddress);
      if (tokenAddresses) {
        const [yesBalance, noBalance] = await Promise.all([
          getUserTokenBalance(connection, wallet.address, tokenAddresses.yesTokenMint),
          getUserTokenBalance(connection, wallet.address, tokenAddresses.noTokenMint),
        ]);
        const decimals = collateralInfo?.decimals || 6;
        setUserTokenBalances({
          yesBalance: yesBalance / Math.pow(10, decimals),
          noBalance: noBalance / Math.pow(10, decimals),
          yesTokenMint: tokenAddresses.yesTokenMint,
          noTokenMint: tokenAddresses.noTokenMint,
        });
      }
    } catch (err) {
      console.error("Failed to fetch token balances:", err);
    }
  }, [connection, marketAddress, wallet?.address, marketInfo, collateralInfo?.decimals]);

  // Fetch balances when wallet connects after market is loaded
  useEffect(() => {
    if (marketInfo && wallet?.address && !userTokenBalances) {
      fetchUserTokenBalances();
    }
  }, [marketInfo, wallet?.address, userTokenBalances, fetchUserTokenBalances]);

  const hasPosition = !!(userTokenBalances && (userTokenBalances.yesBalance > 0 || userTokenBalances.noBalance > 0));

  const fetchMarketInfo = async () => {
    if (!marketAddress.trim()) {
      toast.error("Please enter a market address");
      return;
    }

    setIsFetching(true);
    setMarketInfo(null);
    setCollateralInfo(null);
    setUserTokenBalances(null);

    try {
      const [version, data, yesPrice, noPrice] = await Promise.all([
        getMarketVersion(connection, marketAddress),
        getMarketData(connection, marketAddress),
        getPrice(connection, marketAddress, "yes"),
        getPrice(connection, marketAddress, "no"),
      ]);

      if (version === null || !data) {
        toast.error("Could not find market");
        return;
      }

      // Get creator and collateral token from market account
      const marketAccount = data.marketAccount as any;
      console.log("Market account data:", marketAccount);
      console.log("Market account keys:", Object.keys(marketAccount));

      const creator = marketAccount.creator?.toString() || "";
      const collateralToken = marketAccount.collateralToken?.toString() || "";

      console.log("Creator address:", creator);
      console.log("Collateral token:", collateralToken);

      const resolved = !!marketAccount.resolved;
      const endTime = Number(marketAccount.endTime || marketAccount.end_time || 0);

      setMarketInfo({
        version,
        yesPrice,
        noPrice,
        creator,
        collateralToken,
        reserves: data.marketReserves,
        endTime,
        resolved,
      });

      // Fetch collateral token info from Birdeye (or use known tokens)
      let tokenDecimals = 6;
      if (collateralToken) {
        const known = getKnownToken(collateralToken);
        if (known) {
          setCollateralInfo(known);
          tokenDecimals = known.decimals;
        } else {
          // Fetch from Birdeye API
          const tokenInfo = await getTokenInfo(collateralToken);
          if (tokenInfo) {
            setCollateralInfo(tokenInfo);
            tokenDecimals = tokenInfo.decimals;
          }
        }
      }

      // Fetch user's YES/NO token balances for V2 & V3 markets
      if (wallet?.address) {
        try {
          const tokenAddresses = await getMarketTokenAddresses(connection, marketAddress);
          if (tokenAddresses) {
            const [yesBalance, noBalance] = await Promise.all([
              getUserTokenBalance(connection, wallet.address, tokenAddresses.yesTokenMint),
              getUserTokenBalance(connection, wallet.address, tokenAddresses.noTokenMint),
            ]);
            setUserTokenBalances({
              yesBalance: yesBalance / Math.pow(10, tokenDecimals),
              noBalance: noBalance / Math.pow(10, tokenDecimals),
              yesTokenMint: tokenAddresses.yesTokenMint,
              noTokenMint: tokenAddresses.noTokenMint,
            });
          }
        } catch (err) {
          console.error("Failed to fetch token balances:", err);
        }
      }

      toast.success(`Found V${version} market`);
    } catch (error: any) {
      console.error("Failed to fetch market:", error);
      toast.error(error?.message || "Failed to fetch market info");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet || !isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!marketInfo) {
      toast.error("Please fetch market info first");
      return;
    }

    // Prevent buying if already has position
    if (action === "buy" && hasPosition) {
      toast.error("You have already predicted on this market.");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (marketInfo.resolved) {
      toast.error("Market is already resolved. Trading is locked.");
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= marketInfo.endTime) {
      toast.error("Market has ended. Trading is locked.");
      return;
    }

    if (action === "buy" && (usdcBalance === undefined || usdcBalance < amountNum)) {
      const label = getCollateralLabel();
      toast.error(`Insufficient ${label} balance. You have ${usdcBalance?.toFixed(2) ?? 0} ${label}.`);
      return;
    }

    setIsLoading(true);
    setTxSignature(null);

    try {
      const decimals = collateralInfo?.decimals || COLLATERAL_DECIMALS;
      const amountBaseUnits = Math.floor(amountNum * Math.pow(10, decimals));

      console.log("Trade params:", {
        marketAddress,
        amount: amountNum,
        amountBaseUnits,
        decimals,
        creator: marketInfo.creator,
        side,
        action,
        version: marketInfo.version,
      });

      let signature: string;

      if (marketInfo.version === 3) {
        // V3 market - only buy supported
        if (action === "sell") {
          toast.error("V3 markets don't support selling. Use Redeem after settlement.");
          setIsLoading(false);
          return;
        }

        const result =
          side === "yes"
            ? await buyYesTokenV3(connection, wallet, marketAddress, amountBaseUnits)
            : await buyNoTokenV3(connection, wallet, marketAddress, amountBaseUnits);

        signature = result.txSig;
        if (result.isPotSizeReached) {
          toast.success(`Bought ${side.toUpperCase()}! (Pot limit reached)`);
        } else {
          toast.success(`Bought ${side.toUpperCase()} tokens!`);
        }
      } else {
        // V1/V2 market
        if (action === "buy") {
          signature =
            side === "yes"
              ? await mintYesTokenV2(
                connection,
                wallet,
                marketAddress,
                amountBaseUnits,
                marketInfo.creator
              )
              : await mintNoTokenV2(
                connection,
                wallet,
                marketAddress,
                amountBaseUnits,
                marketInfo.creator
              );
          toast.success(`Bought ${side.toUpperCase()} tokens!`);
        } else {
          signature =
            side === "yes"
              ? await burnYesTokenV2(
                connection,
                wallet,
                marketAddress,
                amountBaseUnits,
                marketInfo.creator
              )
              : await burnNoTokenV2(
                connection,
                wallet,
                marketAddress,
                amountBaseUnits,
                marketInfo.creator
              );
          toast.success(`Sold ${side.toUpperCase()} tokens!`);
        }
      }

      setTxSignature(signature);

      // Refresh global balance
      await queryClient.invalidateQueries({ queryKey: ["balance"] });

      // Refresh market info and balances
      fetchMarketInfo();
      fetchUserTokenBalances();
    } catch (error: any) {
      console.error("Trade failed:", error);
      toast.success(`${action === 'buy' ? 'Purchased' : 'Sold'} successfully!`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full relative">
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Market Address Input */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-phantom mb-2 font-mono-tech">TARGET_ADDRESS</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={marketAddress}
                onChange={(e) => {
                  setMarketAddress(e.target.value);
                  setMarketInfo(null);
                }}
                placeholder="0x..."
                className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-3 font-mono-tech text-sm text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={fetchMarketInfo}
                disabled={isFetching || isLoading}
                className="px-6 bg-white/10 hover:bg-white/20 text-white text-xs font-mono-tech uppercase tracking-wider transition-colors disabled:opacity-50 border border-white/5"
              >
                {isFetching ? "SCANNING" : "LOAD"}
              </button>
            </div>
          </div>

          {/* Market Info Display */}
          {marketInfo && (
            <div className="space-y-6 animate-in">
              <div className="p-4 border border-white/10 bg-white/[0.02]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] text-phantom uppercase tracking-widest">Protocol_Version</span>
                  <span className="font-mono-tech text-xs text-white">V{marketInfo.version}</span>
                </div>

                {/* Collateral Token Info */}
                <div className="flex justify-between items-center mb-6">

                  <div className="flex items-center gap-3">
                    {collateralInfo?.logoURI && (
                      <img
                        src={collateralInfo.logoURI}
                        alt={collateralInfo.symbol}
                        className="w-8 h-8 rounded-full grayscale opacity-80"
                      />
                    )}
                    <div>
                      <p className="text-sm font-bold text-white font-display tracking-wide">
                        {collateralInfo?.symbol || "UNKNOWN"}
                      </p>
                      <p className="text-[10px] text-phantom font-mono-tech">
                        {collateralInfo?.name || marketInfo.collateralToken.slice(0, 8) + "..."}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono-tech text-white">
                      {marketInfo.reserves.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-[10px] text-phantom uppercase">Liquidity</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border border-signal-win/20 bg-signal-win/5">
                    <p className="text-[10px] text-signal-win mb-1 uppercase tracking-wider">YES_ODDS</p>
                    <p className="text-xl font-bold text-white font-mono-tech">
                      {(marketInfo.yesPrice * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center p-3 border border-signal-loss/20 bg-signal-loss/5">
                    <p className="text-[10px] text-signal-loss mb-1 uppercase tracking-wider">NO_ODDS</p>
                    <p className="text-xl font-bold text-white font-mono-tech">
                      {(marketInfo.noPrice * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* User Token Balances */}
              {userTokenBalances && (
                <div className="p-4 border border-white/5 bg-black/40">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] text-phantom uppercase tracking-widest">Your_Holdings</p>
                    <button
                      type="button"
                      onClick={fetchUserTokenBalances}
                      className="text-[10px] text-white/50 hover:text-white underline decoration-dotted"
                    >
                      REFRESH
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-[10px] text-phantom mb-1">POS_YES</p>
                      <p className="font-mono-tech text-white">
                        {userTokenBalances.yesBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-phantom mb-1">POS_NO</p>
                      <p className="font-mono-tech text-white">
                        {userTokenBalances.noBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trade Form - Only show after market is loaded */}
          {marketInfo && (
            <form onSubmit={handleSubmit} className="space-y-6 pt-6 border-t border-white/10">
              {/* Action Toggle - Only for V2 */}
              {marketInfo.version !== 3 && (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-phantom mb-3 font-mono-tech">OPERATION</label>
                  <div className="grid grid-cols-2 gap-1 bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => setAction("buy")}
                      className={`py-2 text-xs font-mono-tech uppercase tracking-wider transition-all ${action === "buy"
                        ? "bg-white text-black font-bold"
                        : "text-phantom hover:text-white"
                        }`}
                      disabled={isLoading}
                    >
                      ACQUIRE
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction("sell")}
                      className={`py-2 text-xs font-mono-tech uppercase tracking-wider transition-all ${action === "sell"
                        ? "bg-white text-black font-bold"
                        : "text-phantom hover:text-white"
                        }`}
                      disabled={isLoading}
                    >
                      LIQUIDATE
                    </button>
                  </div>
                </div>
              )}

              {/* Side Toggle */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-phantom mb-3 font-mono-tech">PREDICTION</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setSide("yes")}
                    className={`flex-1 py-4 border transition-all duration-300 relative overflow-hidden group ${side === "yes"
                      ? "border-signal-win bg-signal-win/10 text-signal-win"
                      : "border-white/10 text-zinc-500 hover:border-white/30"
                      }`}
                    disabled={isLoading || (action === 'buy' && hasPosition)}
                  >
                    <span className="relative z-10 font-bold font-display tracking-widest text-sm">YES</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide("no")}
                    className={`flex-1 py-4 border transition-all duration-300 relative overflow-hidden group ${side === "no"
                      ? "border-signal-loss bg-signal-loss/10 text-signal-loss"
                      : "border-white/10 text-zinc-500 hover:border-white/30"
                      }`}
                    disabled={isLoading || (action === 'buy' && hasPosition)}
                  >
                    <span className="relative z-10 font-bold font-display tracking-widest text-sm">NO</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] uppercase tracking-widest text-phantom font-mono-tech">
                    VOLUME ({collateralInfo?.symbol || "COLLATERAL"})
                  </label>
                  {action === "buy" && usdcBalance !== undefined && (
                    <span className="text-[10px] text-phantom font-mono-tech">
                      AVAIL: {usdcBalance.toLocaleString()}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full bg-transparent border-b border-white/20 px-0 py-3 font-mono-tech text-2xl text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/10"
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !isConnected || Math.floor(Date.now() / 1000) >= marketInfo.endTime || marketInfo.resolved}
                className={`w-full py-4 font-bold tracking-[0.2em] text-sm transition-all uppercase relative overflow-hidden group ${isLoading ? "bg-zinc-800 text-zinc-500" : "bg-white text-black hover:bg-zinc-200"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? "EXECUTING..." : "CONFIRM_TRANSACTION"}
              </button>
            </form>
          )}

          {/* Transaction Result */}
          {txSignature && (
            <div className="p-4 border border-signal-win/30 bg-signal-win/5">
              <p className="text-signal-win text-xs font-mono-tech mb-2">:: TRANSACTION_CONFIRMED ::</p>
              <a
                href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 text-[10px] font-mono-tech hover:text-white hover:underline break-all"
              >
                HASH: {txSignature}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
