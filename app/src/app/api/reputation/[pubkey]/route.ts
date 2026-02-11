import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getProgram, getReputationPda } from "@/lib/solana";
import { rateLimit } from "@/lib/rate-limit";
import { getCached, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> }
) {
  const blocked = rateLimit(request);
  if (blocked) return blocked;

  try {
    const { pubkey } = await params;
    let agentPubkey: PublicKey;
    try {
      agentPubkey = new PublicKey(pubkey);
    } catch {
      return NextResponse.json({ error: "Invalid public key" }, { status: 400 });
    }

    const cacheKey = `/api/reputation/${pubkey}`;
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

    const program = getProgram();
    const [reputationPda] = getReputationPda(agentPubkey);

    const rep = await (program.account as any).agentReputation.fetch(reputationPda);

    const data = {
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
    };

    setCache(cacheKey, data);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error fetching reputation:", err.message);
    return NextResponse.json({ error: "Agent reputation not found" }, { status: 404 });
  }
}
