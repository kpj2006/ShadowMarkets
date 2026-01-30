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
      const errorMsg = error?.message || "";
      if (errorMsg.includes("AccountNotInitialized") || errorMsg.includes("0xbc4")) {
        toast.error(`Account not found. Please get some ${getCollateralLabel()} from a faucet first to initialize your account.`);
      } else {
        toast.error(errorMsg || "Trade failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 h-full border-l border-white/5 bg-zinc-900/80 backdrop-blur-xl">
      <h2 className="text-xl font-bold mb-4 text-white">Trade Market</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Enter a market address to buy or sell tokens. Works for both V2 and V3 markets.
      </p>

      <div className="space-y-4">
        {/* Market Address Input */}
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-300">Market Address</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={marketAddress}
              onChange={(e) => {
                setMarketAddress(e.target.value);
                setMarketInfo(null);
              }}
              placeholder="Enter market address..."
              className="px-4 py-2 bg-black/50 border border-white/10 rounded-lg flex-1 font-mono text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={fetchMarketInfo}
              disabled={isFetching || isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isFetching ? "..." : "Load"}
            </button>
          </div>
        </div>

        {/* Market Info Display */}
        {marketInfo && (
          <div className="p-4 bg-black/40 rounded-lg space-y-3 border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Market Version</span>
              <span className="font-medium text-emerald-400 font-mono">V{marketInfo.version}</span>
            </div>

            {/* Collateral Token Info */}
            <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                {collateralInfo?.logoURI && (
                  <img
                    src={collateralInfo.logoURI}
                    alt={collateralInfo.symbol}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-white">
                    {collateralInfo?.symbol || "Collateral Token"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {collateralInfo?.name || marketInfo.collateralToken.slice(0, 8) + "..."}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {marketInfo.reserves.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-zinc-500">Total Reserves</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-emerald-900/20 border border-emerald-500/20 rounded-lg">
                <p className="text-emerald-400 text-sm">YES Price</p>
                <p className="text-xl font-bold text-white">
                  {(marketInfo.yesPrice * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-3 bg-rose-900/20 border border-rose-500/20 rounded-lg">
                <p className="text-rose-400 text-sm">NO Price</p>
                <p className="text-xl font-bold text-white">
                  {(marketInfo.noPrice * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="text-center p-2 bg-zinc-800/30 rounded-lg">
              <p className="text-zinc-500 text-xs mb-1">Market Status</p>
              {marketInfo.resolved ? (
                <span className="text-white font-bold bg-zinc-600 px-3 py-1 rounded-full text-xs">
                  RESOLVED
                </span>
              ) : Math.floor(Date.now() / 1000) >= marketInfo.endTime ? (
                <span className="text-amber-400 font-bold bg-amber-900/30 border border-amber-800 px-3 py-1 rounded-full text-xs">
                  CLOSED (AWAITING SETTLEMENT)
                </span>
              ) : (
                <span className="text-emerald-400 font-bold bg-emerald-900/30 border border-emerald-800 px-3 py-1 rounded-full text-xs animate-pulse">
                  OPEN (ENDS {new Date(marketInfo.endTime * 1000).toLocaleString()})
                </span>
              )}
            </div>
            {marketInfo.version === 3 && (
              <p className="text-amber-500 text-xs text-center">
                V3 markets only support buying. Sell via Redeem after settlement.
              </p>
            )}

            {/* Position Limit Warning */}
            {hasPosition && action === "buy" && (
              <div className="p-3 bg-indigo-900/30 border border-indigo-500/30 rounded-lg">
                <p className="text-xs text-indigo-200 text-center">
                  ℹ️ You have already predicted on this market. You cannot place additional predictions.
                </p>
              </div>
            )}

            {/* User Token Balances */}
            {userTokenBalances && (
              <div className="mt-3 p-3 bg-zinc-800/30 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-zinc-400 text-xs">Your Token Holdings</p>
                  <button
                    type="button"
                    onClick={fetchUserTokenBalances}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Refresh
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-emerald-900/10 border border-emerald-500/20 rounded">
                    <p className="text-emerald-400 text-xs">YES Tokens</p>
                    <p className="text-lg font-bold text-white">
                      {userTokenBalances.yesBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-rose-900/10 border border-rose-500/20 rounded">
                    <p className="text-rose-400 text-xs">NO Tokens</p>
                    <p className="text-lg font-bold text-white">
                      {userTokenBalances.noBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!userTokenBalances && isConnected && (
              <div className="flex justify-center items-center gap-2 mt-2">
                <p className="text-zinc-500 text-xs">Loading your token balances...</p>
                <button
                  type="button"
                  onClick={fetchUserTokenBalances}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Retry
                </button>
              </div>
            )}
            {!isConnected && (
              <p className="text-zinc-500 text-xs text-center mt-2">
                Connect wallet to see your token holdings
              </p>
            )}
          </div>
        )}

        {/* Trade Form - Only show after market is loaded */}
        {marketInfo && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Action Toggle - Only for V2 */}
            {marketInfo.version !== 3 && (
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-300">Action</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAction("buy")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${action === "buy"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    disabled={isLoading}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction("sell")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${action === "sell"
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    disabled={isLoading}
                  >
                    Sell
                  </button>
                </div>
              </div>
            )}

            {/* Side Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-300">Side</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSide("yes")}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${side === "yes"
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/50"
                    : "bg-zinc-800/50 text-zinc-500 border border-transparent hover:bg-zinc-800"
                    }`}
                  disabled={isLoading || (action === 'buy' && hasPosition)}
                >
                  YES ({(marketInfo.yesPrice * 100).toFixed(1)}%)
                </button>
                <button
                  type="button"
                  onClick={() => setSide("no")}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${side === "no"
                    ? "bg-rose-600/20 text-rose-400 border border-rose-500/50"
                    : "bg-zinc-800/50 text-zinc-500 border border-transparent hover:bg-zinc-800"
                    }`}
                  disabled={isLoading || (action === 'buy' && hasPosition)}
                >
                  NO ({(marketInfo.noPrice * 100).toFixed(1)}%)
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-zinc-300">
                  {action === "sell" && marketInfo.version !== 3
                    ? `Amount (${side.toUpperCase()} tokens)`
                    : `Amount (${collateralInfo?.symbol || "Collateral"})`}
                </label>
                {action === "sell" && userTokenBalances && (
                  <button
                    type="button"
                    onClick={() => {
                      const balance = side === "yes"
                        ? userTokenBalances.yesBalance
                        : userTokenBalances.noBalance;
                      setAmount(balance.toString());
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Max: {(side === "yes"
                      ? userTokenBalances.yesBalance
                      : userTokenBalances.noBalance
                    ).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </button>
                )}
                {action === "buy" && usdcBalance !== undefined && (
                  <span className="text-xs text-zinc-400">
                    Balance: {usdcBalance.toLocaleString()} {collateralInfo?.symbol || "Tokens"}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1"
                min="0.01"
                step="0.01"
                className="px-4 py-3 bg-black/50 border border-white/10 rounded-lg w-full font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !isConnected || Math.floor(Date.now() / 1000) >= marketInfo.endTime || marketInfo.resolved}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${action === "buy" || marketInfo.version === 3
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
                } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading
                ? "Processing..."
                : marketInfo.resolved
                  ? "Market Resolved"
                  : Math.floor(Date.now() / 1000) >= marketInfo.endTime
                    ? "Trading Closed"
                    : `${marketInfo.version === 3 ? "Buy" : action === "buy" ? "Buy" : "Sell"} ${side.toUpperCase()}`}
            </button>
          </form>
        )}

        {/* Transaction Result */}
        {txSignature && (
          <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
            <p className="text-green-400 text-sm mb-2">Transaction successful!</p>
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
    </div>
  );
}
