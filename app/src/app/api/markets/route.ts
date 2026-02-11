import { NextResponse } from "next/server";
import { getProgram } from "@/lib/solana";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const program = getProgram();
    const markets = await (program.account as any).market.all();

    const formatted = markets.map((m: any) => ({
      publicKey: m.publicKey.toBase58(),
      marketId: m.account.marketId.toNumber(),
      creator: m.account.creator.toBase58(),
      title: m.account.title,
      description: m.account.description,
      feedId: "0x" + Buffer.from(m.account.feedId).toString("hex"),
      targetPrice: m.account.targetPrice.toNumber(),
      targetAbove: m.account.targetAbove,
      deadline: m.account.deadline.toNumber(),
      resolutionDeadline: m.account.resolutionDeadline.toNumber(),
      minBet: m.account.minBet.toNumber(),
      maxBet: m.account.maxBet.toNumber(),
      totalYes: m.account.totalYes.toNumber(),
      totalNo: m.account.totalNo.toNumber(),
      totalYesSol: m.account.totalYes.toNumber() / 1e9,
      totalNoSol: m.account.totalNo.toNumber() / 1e9,
      yesCount: m.account.yesCount,
      noCount: m.account.noCount,
      status: Object.keys(m.account.status)[0],
      outcome: m.account.outcome,
      resolvedPrice: m.account.resolvedPrice ? m.account.resolvedPrice.toNumber() : null,
      resolvedAt: m.account.resolvedAt ? m.account.resolvedAt.toNumber() : null,
      createdAt: m.account.createdAt.toNumber(),
    }));

    formatted.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return NextResponse.json({ markets: formatted, count: formatted.length });
  } catch (err: any) {
    console.error("Error listing markets:", err.message);
    return NextResponse.json({ error: "Failed to list markets" }, { status: 500 });
  }
}
