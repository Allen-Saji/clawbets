import { NextRequest, NextResponse } from "next/server";
import { getProgram, getMarketPda, getVaultPda, getConnection } from "@/lib/solana";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const marketId = parseInt(id);
    if (isNaN(marketId)) {
      return NextResponse.json({ error: "Invalid market ID" }, { status: 400 });
    }

    const program = getProgram();
    const [marketPda] = getMarketPda(marketId);
    const [vaultPda] = getVaultPda(marketPda);

    const market = await (program.account as any).market.fetch(marketPda);
    const vaultBalance = await getConnection().getBalance(vaultPda);

    return NextResponse.json({
      publicKey: marketPda.toBase58(),
      vault: vaultPda.toBase58(),
      vaultBalance,
      vaultBalanceSol: vaultBalance / 1e9,
      marketId: market.marketId.toNumber(),
      creator: market.creator.toBase58(),
      title: market.title,
      description: market.description,
      oracleFeed: market.oracleFeed.toBase58(),
      targetPrice: market.targetPrice.toNumber(),
      targetAbove: market.targetAbove,
      deadline: market.deadline.toNumber(),
      resolutionDeadline: market.resolutionDeadline.toNumber(),
      minBet: market.minBet.toNumber(),
      maxBet: market.maxBet.toNumber(),
      totalYes: market.totalYes.toNumber(),
      totalNo: market.totalNo.toNumber(),
      totalYesSol: market.totalYes.toNumber() / 1e9,
      totalNoSol: market.totalNo.toNumber() / 1e9,
      yesCount: market.yesCount,
      noCount: market.noCount,
      status: Object.keys(market.status)[0],
      outcome: market.outcome,
      resolvedPrice: market.resolvedPrice ? market.resolvedPrice.toNumber() : null,
      resolvedAt: market.resolvedAt ? market.resolvedAt.toNumber() : null,
      createdAt: market.createdAt.toNumber(),
      yesOdds: market.totalYes.toNumber() + market.totalNo.toNumber() > 0
        ? (market.totalNo.toNumber() / (market.totalYes.toNumber() + market.totalNo.toNumber()) * 100).toFixed(1)
        : "50.0",
      noOdds: market.totalYes.toNumber() + market.totalNo.toNumber() > 0
        ? (market.totalYes.toNumber() / (market.totalYes.toNumber() + market.totalNo.toNumber()) * 100).toFixed(1)
        : "50.0",
    });
  } catch (err: any) {
    console.error("Error fetching market:", err.message);
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }
}
