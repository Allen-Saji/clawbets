import { NextRequest, NextResponse } from "next/server";
import { getProgram } from "@/lib/solana";
import { rateLimit } from "@/lib/rate-limit";
import { getCached, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const blocked = rateLimit(request);
  if (blocked) return blocked;

  const cacheKey = "/api/reputation";
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const program = getProgram();
    const allReps = await (program.account as any).agentReputation.all();

    const formatted = allReps
      .map((r: any) => ({
        agent: r.account.agent.toBase58(),
        totalBets: r.account.totalBets,
        wins: r.account.wins,
        losses: r.account.losses,
        accuracy: r.account.accuracyBps / 100,
        totalWageredSol: r.account.totalWagered.toNumber() / 1e9,
        totalWonSol: r.account.totalWon.toNumber() / 1e9,
        marketsCreated: r.account.marketsCreated,
        lastActive: r.account.lastActive.toNumber(),
      }))
      .filter((r: any) => r.totalBets > 0)
      .sort((a: any, b: any) => {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.totalBets - a.totalBets;
      });

    const data = { leaderboard: formatted, count: formatted.length };
    setCache(cacheKey, data);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error fetching leaderboard:", err.message);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
