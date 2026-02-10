"use client";

import { motion } from "framer-motion";
import { Market, Bet } from "@/lib/api";
import {
  truncateAddress,
  formatTimestamp,
  timeUntil,
  getStatusBadgeColor,
} from "@/lib/utils";
import Link from "next/link";

export default function MarketDetail({ market, bets }: { market: Market; bets: Bet[] }) {
  const totalPool = market.totalYesSol + market.totalNoSol;
  const yesPercent = totalPool > 0 ? (market.totalYesSol / totalPool) * 100 : 50;

  return (
    <div className="mesh-bg min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-violet-400 transition mb-8 group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          Back to markets
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#0f0f18] border border-[#1a1a2e] rounded-2xl p-7 mb-5"
        >
          <div className="flex items-start justify-between mb-5 gap-4">
            <h2 className="text-2xl font-bold tracking-tight">{market.title}</h2>
            <span className={`shrink-0 text-[10px] px-3 py-1.5 rounded-full border font-medium tracking-wide ${getStatusBadgeColor(market.status)}`}>
              {market.status.toUpperCase()}
            </span>
          </div>
          <p className="text-zinc-500 mb-7 leading-relaxed">{market.description}</p>

          <div className="mb-7">
            <div className="flex justify-between mb-2.5">
              <div>
                <span className="text-emerald-400 text-3xl font-bold tracking-tight">{yesPercent.toFixed(1)}%</span>
                <span className="text-emerald-400/50 text-sm ml-2 font-medium">YES</span>
              </div>
              <div className="text-right">
                <span className="text-rose-400 text-3xl font-bold tracking-tight">{(100 - yesPercent).toFixed(1)}%</span>
                <span className="text-rose-400/50 text-sm ml-2 font-medium">NO</span>
              </div>
            </div>
            <div className="h-3 rounded-full bg-rose-500/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${yesPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Pool", value: `${totalPool.toFixed(3)} SOL`, color: "" },
              { label: "YES Pool", value: `${market.totalYesSol.toFixed(3)} SOL`, sub: `${market.yesCount} bettors`, color: "text-emerald-400" },
              { label: "NO Pool", value: `${market.totalNoSol.toFixed(3)} SOL`, sub: `${market.noCount} bettors`, color: "text-rose-400" },
              { label: market.status === "open" ? "Ends in" : "Ended", value: timeUntil(market.deadline), color: "" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#0a0a10] rounded-xl p-3.5 border border-[#1a1a2e]/40">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                {"sub" in stat && stat.sub && <p className="text-[10px] text-zinc-600 mt-0.5">{stat.sub}</p>}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-[#1a1a2e]/40 grid grid-cols-2 gap-3 text-[13px]">
            <div><span className="text-zinc-600">Target </span><span className="font-medium">Price {market.targetAbove ? "above" : "below"} {market.targetPrice}</span></div>
            <div><span className="text-zinc-600">Oracle </span><span className="font-mono text-[11px]">{truncateAddress(market.oracleFeed, 6)}</span></div>
            <div><span className="text-zinc-600">Min Bet </span><span>{(market.minBet / 1e9).toFixed(2)} SOL</span></div>
            <div><span className="text-zinc-600">Max Bet </span><span>{(market.maxBet / 1e9).toFixed(2)} SOL</span></div>
            <div><span className="text-zinc-600">Created </span><span>{formatTimestamp(market.createdAt)}</span></div>
            <div><span className="text-zinc-600">Creator </span><span className="font-mono text-[11px]">{truncateAddress(market.creator, 6)}</span></div>
          </div>

          {market.status === "resolved" && (
            <div className="mt-5 p-4 rounded-xl bg-violet-500/8 border border-violet-500/15">
              <p className="text-violet-400 font-semibold mb-1">✓ Resolved: {market.outcome ? "YES" : "NO"} wins</p>
              <p className="text-[13px] text-zinc-500">Oracle price: {market.resolvedPrice} • {market.resolvedAt && formatTimestamp(market.resolvedAt)}</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-[#0f0f18] border border-[#1a1a2e] rounded-2xl p-7"
        >
          <h3 className="text-base font-semibold mb-5">Bets <span className="text-zinc-600 font-normal ml-1.5">{bets.length}</span></h3>
          {bets.length === 0 ? (
            <p className="text-zinc-600 text-center py-10 text-sm">No bets placed yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-zinc-600 text-[10px] uppercase tracking-widest border-b border-[#1a1a2e]/60">
                    <th className="text-left py-3 px-3 font-medium">Agent</th>
                    <th className="text-left py-3 px-3 font-medium">Position</th>
                    <th className="text-right py-3 px-3 font-medium">Amount</th>
                    <th className="text-left py-3 px-3 font-medium">Status</th>
                    <th className="text-left py-3 px-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.map((bet) => (
                    <tr key={bet.publicKey} className="border-b border-[#1a1a2e]/30 hover:bg-white/[0.015] transition">
                      <td className="py-3.5 px-3 font-mono text-[11px] text-zinc-400">{truncateAddress(bet.bettor, 6)}</td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${bet.position === "YES" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" : "bg-rose-500/10 text-rose-400 border border-rose-500/15"}`}>{bet.position}</span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold">{bet.amountSol.toFixed(3)} SOL</td>
                      <td className="py-3.5 px-3">{bet.claimed ? <span className="text-violet-400 text-[11px]">Claimed</span> : <span className="text-zinc-600 text-[11px]">Pending</span>}</td>
                      <td className="py-3.5 px-3 text-[11px] text-zinc-600">{formatTimestamp(bet.placedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
