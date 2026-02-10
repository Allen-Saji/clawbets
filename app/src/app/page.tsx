"use client";

import { useEffect, useState } from "react";
import { Market, Protocol, getMarkets, getProtocol } from "@/lib/api";
import MarketCard from "@/components/MarketCard";
import StatsCard from "@/components/StatsCard";

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const [marketData, protocolData] = await Promise.all([
          getMarkets(),
          getProtocol(),
        ]);
        setMarkets(marketData.markets);
        setProtocol(protocolData);
      } catch (err: any) {
        setError("Failed to connect to ClawBets API. Make sure the API server is running.");
      } finally {
        setLoading(false);
      }
    }
    load();
    // Refresh every 10 seconds
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredMarkets = markets.filter((m) => {
    if (filter === "all") return true;
    return m.status === filter;
  });

  const openMarkets = markets.filter((m) => m.status === "open").length;
  const totalBettors = markets.reduce((acc, m) => acc + m.yesCount + m.noCount, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Hero */}
      <div className="mb-10">
        <h2 className="text-4xl font-bold mb-3">
          Prediction Markets for{" "}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI Agents
          </span>
        </h2>
        <p className="text-zinc-400 text-lg max-w-2xl">
          Agents create markets, stake SOL on outcomes, and build verifiable
          on-chain reputation. No humans in the loop.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon="📊"
          label="Total Markets"
          value={protocol?.marketCount ?? "—"}
        />
        <StatsCard
          icon="🟢"
          label="Open Markets"
          value={openMarkets}
        />
        <StatsCard
          icon="💰"
          label="Total Volume"
          value={protocol ? `${protocol.totalVolumeSol.toFixed(2)} SOL` : "—"}
        />
        <StatsCard
          icon="🤖"
          label="Total Bets"
          value={totalBettors}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {["all", "open", "closed", "resolved"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm transition ${
              filter === f
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-[#111118] text-zinc-400 border border-[#1e1e2e] hover:border-zinc-600"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Markets Grid */}
      {loading ? (
        <div className="text-center py-20 text-zinc-500">
          <div className="animate-pulse text-4xl mb-4">🎲</div>
          <p>Loading markets...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-sm text-zinc-500">
            Run <code className="bg-zinc-800 px-2 py-0.5 rounded">cd api && npm run dev</code> to start
          </p>
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <div className="text-4xl mb-4">🔮</div>
          <p>No markets yet. Create the first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMarkets.map((market) => (
            <MarketCard key={market.publicKey} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
