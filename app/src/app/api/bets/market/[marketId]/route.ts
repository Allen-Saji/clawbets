import { NextRequest, NextResponse } from "next/server";
import { getProgram, getMarketPda } from "@/lib/solana";
import { rateLimit } from "@/lib/rate-limit";
import { getCached, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const blocked = rateLimit(request);
  if (blocked) return blocked;

  try {
    const { marketId: marketIdStr } = await params;
    const marketId = parseInt(marketIdStr);
    if (isNaN(marketId)) {
      return NextResponse.json({ error: "Invalid market ID" }, { status: 400 });
    }

    const cacheKey = `/api/bets/market/${marketId}`;
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

    const program = getProgram();
    const [marketPda] = getMarketPda(marketId);

    const bets = await (program.account as any).bet.all([
      {
        memcmp: {
          offset: 8 + 32,
          bytes: marketPda.toBase58(),
        },
      },
    ]);

    const formatted = bets.map((b: any) => ({
      publicKey: b.publicKey.toBase58(),
      bettor: b.account.bettor.toBase58(),
      market: b.account.market.toBase58(),
      amount: b.account.amount.toNumber(),
      amountSol: b.account.amount.toNumber() / 1e9,
      position: b.account.position ? "YES" : "NO",
      claimed: b.account.claimed,
      placedAt: b.account.placedAt.toNumber(),
    }));

    const data = { bets: formatted, count: formatted.length };
    setCache(cacheKey, data);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error listing bets:", err.message);
    return NextResponse.json({ error: "Failed to list bets" }, { status: 500 });
  }
}
