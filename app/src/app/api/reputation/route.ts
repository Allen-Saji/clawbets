import { NextResponse } from "next/server";
import { getProgram } from "@/lib/solana";

export const dynamic = "force-dynamic";

export async function GET() {
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

    return NextResponse.json({ leaderboard: formatted, count: formatted.length });
  } catch (err: any) {
    console.error("Error fetching leaderboard:", err.message);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
