import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getProgram } from "@/lib/solana";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> }
) {
  try {
    const { pubkey } = await params;
    let agentPubkey: PublicKey;
    try {
      agentPubkey = new PublicKey(pubkey);
    } catch {
      return NextResponse.json({ error: "Invalid public key" }, { status: 400 });
    }
    const program = getProgram();

    const bets = await (program.account as any).bet.all([
      {
        memcmp: {
          offset: 8,
          bytes: agentPubkey.toBase58(),
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
    console.error("Error listing agent bets:", err.message);
    return NextResponse.json({ error: "Failed to list agent bets" }, { status: 500 });
  }
}
