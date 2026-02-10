"use client";

import { Market } from "@/lib/api";
import { truncateAddress, timeUntil, getStatusBadgeColor } from "@/lib/utils";
import Link from "next/link";

export default function MarketCard({ market }: { market: Market }) {
  const totalPool = market.totalYesSol + market.totalNoSol;
  const yesPercent =
    totalPool > 0 ? (market.totalYesSol / totalPool) * 100 : 50;
  const noPercent = 100 - yesPercent;

  return (
    <Link href={`/market/${market.marketId}`}>
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5 hover:border-purple-500/40 transition-all cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold group-hover:text-purple-400 transition pr-4">
            {market.title}
          </h3>
          <span
            className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${getStatusBadgeColor(
              market.status
            )}`}
          >
            {market.status.toUpperCase()}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
          {market.description}
        </p>

        {/* Odds Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-green-400 font-medium">
              YES {yesPercent.toFixed(0)}%
            </span>
            <span className="text-red-400 font-medium">
              NO {noPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-red-500/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-zinc-500">Pool</p>
            <p className="font-medium">{totalPool.toFixed(2)} SOL</p>
          </div>
          <div>
            <p className="text-zinc-500">Bettors</p>
            <p className="font-medium">{market.yesCount + market.noCount}</p>
          </div>
          <div>
            <p className="text-zinc-500">
              {market.status === "open" ? "Ends in" : "Deadline"}
            </p>
            <p className="font-medium">{timeUntil(market.deadline)}</p>
          </div>
        </div>

        {/* Creator */}
        <div className="mt-3 pt-3 border-t border-[#1e1e2e] text-xs text-zinc-500">
          Created by {truncateAddress(market.creator)}
        </div>
      </div>
    </Link>
  );
}
