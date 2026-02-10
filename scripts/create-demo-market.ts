import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";

const idl = JSON.parse(fs.readFileSync("./target/idl/clawbets.json", "utf8"));

// Pyth devnet SOL/USD price feed
const PYTH_SOL_USD_DEVNET = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");

async function main() {
  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );
  const keypairData = fs.readFileSync("/root/.config/solana/id.json", "utf8");
  const keypair = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(keypairData))
  );
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const program = new anchor.Program(idl, provider);

  const [protocolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );

  const protocol = await (program.account as any).protocol.fetch(protocolPda);
  const marketId = protocol.marketCount.toNumber();

  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), new anchor.BN(marketId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketPda.toBuffer()],
    program.programId
  );
  const [reputationPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), wallet.publicKey.toBuffer()],
    program.programId
  );

  const now = Math.floor(Date.now() / 1000);
  const deadline = now + 86400; // 24 hours
  const resolutionDeadline = now + 172800; // 48 hours

  // SOL target: $200 (Pyth uses price * 10^8 with expo -8)
  const targetPrice = 20000000000; // $200.00 in Pyth format

  console.log("Creating demo market on devnet...");
  console.log("Market ID:", marketId);
  console.log("Oracle: Pyth SOL/USD devnet");
  console.log("Target: SOL above $200");
  console.log("Deadline:", new Date(deadline * 1000).toISOString());

  const tx = await program.methods
    .createMarket(
      "Will SOL be above $200 in 24h?",
      "Prediction market on SOL price. Resolves via Pyth SOL/USD oracle feed. YES wins if SOL is above $200 at deadline.",
      PYTH_SOL_USD_DEVNET,
      new anchor.BN(targetPrice),
      true, // target_above
      new anchor.BN(deadline),
      new anchor.BN(resolutionDeadline),
      new anchor.BN(0.01 * 1e9), // min bet 0.01 SOL
      new anchor.BN(10 * 1e9) // max bet 10 SOL
    )
    .accounts({
      creator: wallet.publicKey,
      protocol: protocolPda,
      market: marketPda,
      vault: vaultPda,
      reputation: reputationPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Market created! TX:", tx);
  console.log("Market PDA:", marketPda.toBase58());
  console.log("Vault PDA:", vaultPda.toBase58());

  // Place a demo YES bet
  const betAmount = 0.1 * 1e9; // 0.1 SOL
  const [betPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bet"), marketPda.toBuffer(), wallet.publicKey.toBuffer()],
    program.programId
  );

  const betTx = await program.methods
    .placeBet(new anchor.BN(betAmount), true) // YES
    .accounts({
      bettor: wallet.publicKey,
      market: marketPda,
      bet: betPda,
      vault: vaultPda,
      reputation: reputationPda,
      protocol: protocolPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Demo YES bet placed! TX:", betTx);
  console.log("Amount: 0.1 SOL on YES");

  const market = await (program.account as any).market.fetch(marketPda);
  console.log("\nMarket State:");
  console.log("  Title:", market.title);
  console.log("  Total YES:", market.totalYes.toNumber() / 1e9, "SOL");
  console.log("  Total NO:", market.totalNo.toNumber() / 1e9, "SOL");
  console.log("  Status:", Object.keys(market.status)[0]);
}

main().catch(console.error);
