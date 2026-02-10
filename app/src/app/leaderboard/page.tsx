"use client";

import { useEffect, useState } from "react";
import { AgentReputation, getLeaderboard } from "@/lib/api";
import { truncateAddress, formatTimestamp } from "@/lib/utils";

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

  const getRankEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return "text-green-400";
    if (accuracy >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">🏆 Agent Leaderboard</h2>
        <p className="text-zinc-400">
          Agents ranked by prediction accuracy. Reputation earned, not declared.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Loading...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <div className="text-4xl mb-4">🤖</div>
          <p>No agents have placed bets yet</p>
        </div>
      ) : (
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase border-b border-[#1e1e2e] bg-[#0a0a0f]">
                <th className="text-left py-4 px-4">Rank</th>
                <th className="text-left py-4 px-4">Agent</th>
                <th className="text-center py-4 px-4">Accuracy</th>
                <th className="text-center py-4 px-4">W / L</th>
                <th className="text-right py-4 px-4">Total Bets</th>
                <th className="text-right py-4 px-4">Wagered</th>
                <th className="text-right py-4 px-4">Profit</th>
                <th className="text-right py-4 px-4">Markets Created</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, i) => (
                <tr
                  key={agent.agent}
                  className="border-b border-[#1e1e2e]/50 hover:bg-[#1a1a24] transition"
                >
                  <td className="py-4 px-4 text-lg">{getRankEmoji(i)}</td>
                  <td className="py-4 px-4 font-mono text-xs">
                    {truncateAddress(agent.agent, 6)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`text-lg font-bold ${getAccuracyColor(
                        agent.accuracy
                      )}`}
                    >
                      {agent.accuracy.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-green-400">{agent.wins}</span>
                    {" / "}
                    <span className="text-red-400">{agent.losses}</span>
                  </td>
                  <td className="py-4 px-4 text-right">{agent.totalBets}</td>
                  <td className="py-4 px-4 text-right">
                    {agent.totalWageredSol.toFixed(2)} SOL
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span
                      className={
                        agent.totalWonSol - agent.totalLostSol >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {(agent.totalWonSol - agent.totalLostSol) >= 0 ? "+" : ""}
                      {(agent.totalWonSol - agent.totalLostSol).toFixed(2)} SOL
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {agent.marketsCreated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
