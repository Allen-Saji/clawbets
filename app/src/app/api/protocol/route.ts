import { NextResponse } from "next/server";
import { getProgram, getProtocolPda, getProgramId } from "@/lib/solana";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const program = getProgram();
    const [protocolPda] = getProtocolPda();
    const protocol = await (program.account as any).protocol.fetch(protocolPda);

    return NextResponse.json({
      admin: protocol.admin.toBase58(),
      marketCount: protocol.marketCount.toNumber(),
      totalVolume: protocol.totalVolume.toNumber(),
      totalVolumeSol: protocol.totalVolume.toNumber() / 1e9,
      programId: getProgramId().toBase58(),
    });
  } catch (err: any) {
    console.error("Error fetching protocol:", err.message);
    return NextResponse.json({ error: "Failed to fetch protocol data" }, { status: 500 });
  }
}
