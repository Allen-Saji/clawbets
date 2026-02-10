import { Router, Request, Response } from "express";
import { getProgram, getProtocolPda, connection, PROGRAM_ID, RPC_URL } from "../services/solana";

export const protocolRouter = Router();

// GET /api/protocol - Get protocol stats
protocolRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const program = getProgram();
    const [protocolPda] = getProtocolPda();
    const protocol = await program.account.protocol.fetch(protocolPda);

    res.json({
      admin: protocol.admin.toBase58(),
      marketCount: protocol.marketCount.toNumber(),
      totalVolume: protocol.totalVolume.toNumber(),
      totalVolumeSol: protocol.totalVolume.toNumber() / 1e9,
      programId: PROGRAM_ID.toBase58(),
      rpcUrl: RPC_URL,
    });
  } catch (err: any) {
    console.error("Error fetching protocol:", err.message);
    res.status(500).json({ error: "Failed to fetch protocol data" });
  }
});

// POST /api/protocol/initialize - Initialize protocol (one-time)
protocolRouter.post("/initialize", async (_req: Request, res: Response) => {
  try {
    const program = getProgram();
    const [protocolPda] = getProtocolPda();

    // Check if already initialized
    try {
      await program.account.protocol.fetch(protocolPda);
      res.status(409).json({ error: "Protocol already initialized" });
      return;
    } catch {
      // Not initialized, continue
    }

    const tx = await program.methods
      .initialize()
      .accounts({})
      .rpc();

    res.json({
      success: true,
      transaction: tx,
      protocol: protocolPda.toBase58(),
    });
  } catch (err: any) {
    console.error("Error initializing protocol:", err.message);
    res.status(500).json({ error: "Failed to initialize protocol" });
  }
});
