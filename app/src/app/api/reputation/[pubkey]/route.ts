import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getProgram, getReputationPda } from "@/lib/solana";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> }
) {
  try {
    const { pubkey } = await params;
    const agentPubkey = new PublicKey(pubkey);
    const program = getProgram();
    const [reputationPda] = getReputationPda(agentPubkey);

    const rep = await (program.account as any).agentReputation.fetch(reputationPda);

    return NextResponse.json({
      agent: rep.agent.toBase58(),
      totalBets: rep.totalBets,
      wins: rep.wins,
      losses: rep.losses,
      accuracy: rep.accuracyBps / 100,
      accuracyBps: rep.accuracyBps,
      totalWagered: rep.totalWagered.toNumber(),
      totalWageredSol: rep.totalWagered.toNumber() / 1e9,
      totalWon: rep.totalWon.toNumber(),
      totalWonSol: rep.totalWon.toNumber() / 1e9,
      totalLost: rep.totalLost.toNumber(),
      totalLostSol: rep.totalLost.toNumber() / 1e9,
      marketsCreated: rep.marketsCreated,
      lastActive: rep.lastActive.toNumber(),
    });
  } catch (err: any) {
    console.error("Error fetching reputation:", err.message);
    return NextResponse.json({ error: "Agent reputation not found" }, { status: 404 });
  }
}
