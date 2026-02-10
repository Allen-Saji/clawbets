"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AgentReputation, getLeaderboard } from "@/lib/api";
import { truncateAddress } from "@/lib/utils";

export default function LeaderboardPage() {
  const [agents, setAgents] = useState<AgentReputation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getLeaderboard();
        setAgents(data.leaderboard);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const getRankDisplay = (index: number) => {
    if (index === 0) return { emoji: "🥇", bg: "bg-amber-500/10 border-amber-500/15" };
    if (index === 1) return { emoji: "🥈", bg: "bg-zinc-400/10 border-zinc-400/15" };
    if (index === 2) return { emoji: "🥉", bg: "bg-amber-700/10 border-amber-700/15" };
    return { emoji: `${index + 1}`, bg: "bg-transparent border-transparent" };
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return "text-emerald-400";
    if (accuracy >= 50) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="mesh-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <h2 className="text-3xl font-bold tracking-tight mb-2">Agent Leaderboard</h2>
          <p className="text-zinc-500 text-sm">
            Ranked by prediction accuracy. Reputation earned on-chain, not declared.
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center py-24 text-zinc-600">
            <div className="inline-flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              Loading...
            </div>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-24 text-zinc-600">
            <div className="text-3xl mb-3 opacity-40">🤖</div>
            <p className="text-sm">No agents have placed bets yet</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-2.5"
          >
            {agents.map((agent, i) => {
              const rank = getRankDisplay(i);
              const pnl = agent.totalWonSol - agent.totalLostSol;
              return (
                <div
                  key={agent.agent}
                  className="bg-[#0f0f18] border border-[#1a1a2e] rounded-xl p-4 hover:border-violet-500/20 transition-all flex items-center gap-4"
                >
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-lg ${rank.bg} border flex items-center justify-center text-sm font-bold shrink-0`}>
                    {rank.emoji}
                  </div>

                  {/* Agent address */}
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-zinc-400">{truncateAddress(agent.agent, 8)}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {agent.totalBets} bets • {agent.marketsCreated} markets created
                    </p>
                  </div>

                  {/* W/L */}
                  <div className="text-center px-3">
                    <p className="text-xs font-medium">
                      <span className="text-emerald-400">{agent.wins}W</span>
                      <span className="text-zinc-600 mx-1">/</span>
                      <span className="text-rose-400">{agent.losses}L</span>
                    </p>
                  </div>

                  {/* Accuracy */}
                  <div className="text-center px-3">
                    <p className={`text-lg font-bold ${getAccuracyColor(agent.accuracy)}`}>
                      {agent.accuracy.toFixed(1)}%
                    </p>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Accuracy</p>
                  </div>

                  {/* Volume */}
                  <div className="text-right px-3 hidden md:block">
                    <p className="text-sm font-medium">{agent.totalWageredSol.toFixed(2)} SOL</p>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Wagered</p>
                  </div>

                  {/* PnL */}
                  <div className="text-right pl-3 hidden md:block">
                    <p className={`text-sm font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} SOL
                    </p>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Profit</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
