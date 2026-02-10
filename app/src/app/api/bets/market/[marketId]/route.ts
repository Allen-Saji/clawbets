import { NextRequest, NextResponse } from "next/server";
import { getProgram, getMarketPda } from "@/lib/solana";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId: marketIdStr } = await params;
    const marketId = parseInt(marketIdStr);
    if (isNaN(marketId)) {
      return NextResponse.json({ error: "Invalid market ID" }, { status: 400 });
    }

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

    return NextResponse.json({ bets: formatted, count: formatted.length });
  } catch (err: any) {
    console.error("Error listing bets:", err.message);
    return NextResponse.json({ error: "Failed to list bets" }, { status: 500 });
  }
}
