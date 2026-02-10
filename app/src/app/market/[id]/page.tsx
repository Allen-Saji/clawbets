"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Market, Bet, getMarket, getMarketBets } from "@/lib/api";
import {
  truncateAddress,
  formatTimestamp,
  timeUntil,
  getStatusBadgeColor,
} from "@/lib/utils";
import Link from "next/link";

export default function MarketPage() {
  const params = useParams();
  const id = Number(params.id);
  const [market, setMarket] = useState<Market | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [marketData, betsData] = await Promise.all([
          getMarket(id),
          getMarketBets(id),
        ]);
        setMarket(marketData);
        setBets(betsData.bets);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-zinc-500">
        <div className="animate-pulse text-4xl mb-4">🎲</div>
        Loading market...
      </div>
    );
  }

  if (!market) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-red-400">Market not found</p>
        <Link href="/" className="text-purple-400 hover:underline mt-4 inline-block">
          ← Back to markets
        </Link>
      </div>
    );
  }

  const totalPool = market.totalYesSol + market.totalNoSol;
  const yesPercent = totalPool > 0 ? (market.totalYesSol / totalPool) * 100 : 50;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <Link href="/" className="text-sm text-zinc-500 hover:text-purple-400 transition mb-6 inline-block">
        ← Back to markets
      </Link>

      {/* Market Header */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold">{market.title}</h2>
          <span
            className={`text-xs px-3 py-1.5 rounded-full border ${getStatusBadgeColor(
              market.status
            )}`}
          >
            {market.status.toUpperCase()}
          </span>
        </div>
        <p className="text-zinc-400 mb-6">{market.description}</p>

        {/* Odds Bar Large */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <div>
              <span className="text-green-400 text-2xl font-bold">
                {yesPercent.toFixed(1)}%
              </span>
              <span className="text-green-400/60 text-sm ml-2">YES</span>
            </div>
            <div className="text-right">
              <span className="text-red-400 text-2xl font-bold">
                {(100 - yesPercent).toFixed(1)}%
              </span>
              <span className="text-red-400/60 text-sm ml-2">NO</span>
            </div>
          </div>
          <div className="h-4 rounded-full bg-red-500/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a0a0f] rounded-lg p-3">
            <p className="text-xs text-zinc-500">Total Pool</p>
            <p className="text-lg font-bold">{totalPool.toFixed(3)} SOL</p>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg p-3">
            <p className="text-xs text-zinc-500">YES Pool</p>
            <p className="text-lg font-bold text-green-400">
              {market.totalYesSol.toFixed(3)} SOL
            </p>
            <p className="text-xs text-zinc-500">{market.yesCount} bettors</p>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg p-3">
            <p className="text-xs text-zinc-500">NO Pool</p>
            <p className="text-lg font-bold text-red-400">
              {market.totalNoSol.toFixed(3)} SOL
            </p>
            <p className="text-xs text-zinc-500">{market.noCount} bettors</p>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg p-3">
            <p className="text-xs text-zinc-500">
              {market.status === "open" ? "Ends in" : "Ended"}
            </p>
            <p className="text-lg font-bold">{timeUntil(market.deadline)}</p>
          </div>
        </div>

        {/* Market Details */}
        <div className="mt-6 pt-4 border-t border-[#1e1e2e] grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-zinc-500">Target: </span>
            <span className="font-medium">
              Price {market.targetAbove ? "above" : "below"}{" "}
              {market.targetPrice}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Oracle: </span>
            <span className="font-mono text-xs">
              {truncateAddress(market.oracleFeed, 6)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Min Bet: </span>
            <span>{(market.minBet / 1e9).toFixed(2)} SOL</span>
          </div>
          <div>
            <span className="text-zinc-500">Max Bet: </span>
            <span>{(market.maxBet / 1e9).toFixed(2)} SOL</span>
          </div>
          <div>
            <span className="text-zinc-500">Created: </span>
            <span>{formatTimestamp(market.createdAt)}</span>
          </div>
          <div>
            <span className="text-zinc-500">Creator: </span>
            <span className="font-mono text-xs">
              {truncateAddress(market.creator, 6)}
            </span>
          </div>
        </div>

        {/* Resolution Info */}
        {market.status === "resolved" && (
          <div className="mt-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-purple-400 font-semibold mb-1">
              ✅ Market Resolved:{" "}
              {market.outcome ? "YES" : "NO"} wins!
            </p>
            <p className="text-sm text-zinc-400">
              Oracle price at resolution: {market.resolvedPrice} •{" "}
              {market.resolvedAt && formatTimestamp(market.resolvedAt)}
            </p>
          </div>
        )}
      </div>

      {/* Bets Table */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">
          Bets ({bets.length})
        </h3>
        {bets.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">
            No bets placed yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase border-b border-[#1e1e2e]">
                  <th className="text-left py-3 px-2">Agent</th>
                  <th className="text-left py-3 px-2">Position</th>
                  <th className="text-right py-3 px-2">Amount</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-left py-3 px-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet) => (
                  <tr
                    key={bet.publicKey}
                    className="border-b border-[#1e1e2e]/50 hover:bg-[#1a1a24] transition"
                  >
                    <td className="py-3 px-2 font-mono text-xs">
                      {truncateAddress(bet.bettor, 6)}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          bet.position === "YES"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {bet.position}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-medium">
                      {bet.amountSol.toFixed(3)} SOL
                    </td>
                    <td className="py-3 px-2">
                      {bet.claimed ? (
                        <span className="text-purple-400 text-xs">Claimed</span>
                      ) : (
                        <span className="text-zinc-500 text-xs">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-xs text-zinc-500">
                      {formatTimestamp(bet.placedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
