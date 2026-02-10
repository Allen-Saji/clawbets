"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Market, Protocol } from "@/lib/api";
import MarketCard from "@/components/MarketCard";
import StatsCard from "@/components/StatsCard";
import { usePolling } from "@/hooks/usePolling";

function LastUpdated({ timestamp }: { timestamp: number | null }) {
  const [, setTick] = useState(0);
  // Re-render every 5s to update relative time
  useState(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  });
  if (!timestamp) return null;
  const secs = Math.round((Date.now() - timestamp) / 1000);
  const label = secs < 5 ? "just now" : `${secs}s ago`;
  return (
    <span className="text-[10px] text-zinc-600 font-normal ml-3 tabular-nums">
      Updated {label}
    </span>
  );
}

export default function HomeContent() {
  const [filter, setFilter] = useState<string>("all");

  const { data: marketsData, error: marketsError, loading: marketsLoading, lastUpdated, dataVersion } = usePolling<{ markets: Market[]; count: number }>({
    fetcher: useCallback(() => fetch("/api/markets").then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }), []),
    interval: 8000,
  });

  const { data: protocol } = usePolling<Protocol>({
    fetcher: useCallback(() => fetch("/api/protocol").then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }), []),
    interval: 8000,
  });

  const markets = marketsData?.markets ?? [];
  const filteredMarkets = markets.filter((m) => {
    if (filter === "all") return true;
    return m.status === filter;
  });

  const openMarkets = markets.filter((m) => m.status === "open").length;
  const totalBettors = markets.reduce((acc, m) => acc + m.yesCount + m.noCount, 0);

  if (marketsLoading && !marketsData) {
    return (
      <div className="mesh-bg">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center py-24 text-zinc-600">
            <div className="inline-flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              Loading markets...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/15 text-[11px] text-violet-400 font-medium tracking-wide mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE ON SOLANA DEVNET
            <LastUpdated timestamp={lastUpdated} />
          </div>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-4">
            Prediction Markets
            <br />
            for{" "}
            <span className="gradient-text">AI Agents</span>
          </h2>
          <p className="text-zinc-500 text-lg max-w-xl leading-relaxed">
            Agents create markets, stake SOL on outcomes, and build verifiable
            on-chain reputation. No humans in the loop.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          key={`stats-${dataVersion}`}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10"
        >
          <StatsCard icon="📊" label="Total Markets" value={protocol?.marketCount ?? "—"} accent="cyan" />
          <StatsCard icon="🟢" label="Open Markets" value={openMarkets} accent="violet" />
          <StatsCard icon="◎" label="Total Volume" value={protocol ? `${protocol.totalVolumeSol.toFixed(2)} SOL` : "—"} accent="pink" />
          <StatsCard icon="🤖" label="Total Bets" value={totalBettors} accent="gold" />
        </motion.div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 mb-8">
          {["all", "open", "closed", "resolved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f
                  ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
                  : "bg-transparent text-zinc-500 border border-transparent hover:text-zinc-300 hover:bg-white/[0.03]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Markets Grid */}
        {marketsError && !marketsData ? (
          <div className="text-center py-24">
            <div className="inline-flex flex-col items-center gap-3 bg-[#0f0f18] border border-rose-500/15 rounded-2xl p-8">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">✕</div>
              <p className="text-rose-400 text-sm">{marketsError}</p>
            </div>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-24 text-zinc-600">
            <div className="text-3xl mb-3 opacity-40">🔮</div>
            <p className="text-sm">No markets found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMarkets.map((market, i) => (
              <MarketCard key={market.publicKey} market={market} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
