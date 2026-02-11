import { NextResponse } from "next/server";
import { getProgram } from "@/lib/solana";

export const dynamic = "force-dynamic";

interface ActivityItem {
  id: string;
  type: "bet" | "market_created";
  timestamp: number;
  agent: string;
  details: {
    marketId?: number;
    marketPublicKey?: string;
    marketTitle?: string;
    amount?: number;
    amountSol?: number;
    position?: string;
  };
}

export async function GET() {
  try {
    const program = getProgram();

    const [marketsRaw, betsRaw] = await Promise.all([
      (program.account as any).market.all(),
      (program.account as any).bet.all(),
    ]);

    const marketMap = new Map<string, { title: string; marketId: number; publicKey: string }>();
    const activities: ActivityItem[] = [];

    for (const m of marketsRaw) {
      const pk = m.publicKey.toBase58();
      const marketId = m.account.marketId.toNumber();
      const title = m.account.title;
      marketMap.set(pk, { title, marketId, publicKey: pk });

      activities.push({
        id: `market-${pk}`,
        type: "market_created",
        timestamp: m.account.createdAt.toNumber(),
        agent: m.account.creator.toBase58(),
        details: {
          marketId,
          marketPublicKey: pk,
          marketTitle: title,
        },
      });
    }

    for (const b of betsRaw) {
      const marketPk = b.account.market.toBase58();
      const marketInfo = marketMap.get(marketPk);
      const amountLamports = b.account.amount.toNumber();

      activities.push({
        id: `bet-${b.publicKey.toBase58()}`,
        type: "bet",
        timestamp: b.account.placedAt.toNumber(),
        agent: b.account.bettor.toBase58(),
        details: {
          marketId: marketInfo?.marketId,
          marketPublicKey: marketPk,
          marketTitle: marketInfo?.title ?? "Unknown Market",
          amount: amountLamports,
          amountSol: amountLamports / 1e9,
          position: b.account.position ? "YES" : "NO",
        },
      });
    }

    activities.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      activities: activities.slice(0, 50),
      count: activities.length,
    });
  } catch (err: any) {
    console.error("Error fetching activity:", err.message);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
