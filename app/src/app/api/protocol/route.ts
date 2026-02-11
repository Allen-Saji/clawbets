import { NextRequest, NextResponse } from "next/server";
import { getProgram, getProtocolPda, getProgramId } from "@/lib/solana";
import { rateLimit } from "@/lib/rate-limit";
import { getCached, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const blocked = rateLimit(request);
  if (blocked) return blocked;

  const cacheKey = "/api/protocol";
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const program = getProgram();
    const [protocolPda] = getProtocolPda();
    const protocol = await (program.account as any).protocol.fetch(protocolPda);

    const data = {
      admin: protocol.admin.toBase58(),
      marketCount: protocol.marketCount.toNumber(),
      totalVolume: protocol.totalVolume.toNumber(),
      totalVolumeSol: protocol.totalVolume.toNumber() / 1e9,
      programId: getProgramId().toBase58(),
    };

    setCache(cacheKey, data);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error fetching protocol:", err.message);
    return NextResponse.json({ error: "Failed to fetch protocol data" }, { status: 500 });
  }
}
