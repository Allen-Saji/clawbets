"use client";

import { Market } from "@/lib/api";
import { truncateAddress, timeUntil, getStatusBadgeColor } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";

export default function MarketCard({ market, index = 0 }: { market: Market; index?: number }) {
  const totalPool = market.totalYesSol + market.totalNoSol;
  const yesPercent = totalPool > 0 ? (market.totalYesSol / totalPool) * 100 : 50;
  const noPercent = 100 - yesPercent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Link href={`/market/${market.marketId}`}>
        <div className="card-hover bg-[#0f0f18] border border-[#1a1a2e] rounded-2xl p-5 cursor-pointer group relative overflow-hidden">
          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Header */}
          <div className="flex items-start justify-between mb-3 gap-3">
            <h3 className="text-[15px] font-semibold leading-snug group-hover:text-cyan-400 transition-colors">
              {market.title}
            </h3>
            <span
              className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full border font-medium tracking-wide ${getStatusBadgeColor(market.status)}`}
            >
              {market.status.toUpperCase()}
            </span>
          </div>

          {/* Description */}
          <p className="text-[13px] text-zinc-500 mb-4 line-clamp-2 leading-relaxed">
            {market.description}
          </p>

          {/* Odds Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[11px] mb-1.5 font-medium">
              <span className="text-emerald-400">YES {yesPercent.toFixed(0)}%</span>
              <span className="text-rose-400">NO {noPercent.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-rose-500/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${yesPercent}%` }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 text-[11px]">
            <div>
              <p className="text-zinc-600 mb-0.5">Pool</p>
              <p className="font-semibold">{totalPool.toFixed(2)} SOL</p>
            </div>
            <div>
              <p className="text-zinc-600 mb-0.5">Bettors</p>
              <p className="font-semibold">{market.yesCount + market.noCount}</p>
            </div>
            <div>
              <p className="text-zinc-600 mb-0.5">{market.status === "open" ? "Ends" : "Ended"}</p>
              <p className="font-semibold">{timeUntil(market.deadline)}</p>
            </div>
          </div>

          {/* Creator */}
          <div className="mt-3.5 pt-3 border-t border-[#1a1a2e]/60 text-[11px] text-zinc-600 font-mono">
            {truncateAddress(market.creator)}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
