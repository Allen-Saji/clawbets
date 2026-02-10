import { Program, AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";

const PROGRAM_ID = new PublicKey("3kBwjzUXtVeUshBWDD1Ls5PZPqQZgQUGNUTdP6jCqobb");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const secret = JSON.parse(fs.readFileSync("/root/.openclaw/workspace/clawbets/my-keypair.json", "utf-8"));
const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));

const idl = JSON.parse(fs.readFileSync("/root/.openclaw/workspace/clawbets/target/idl/clawbets.json", "utf-8"));

const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: "confirmed" });
const program = new Program(idl, provider);

const marketId = 2;
const amount = new BN(0.05 * 1e9); // 0.05 SOL
const position = false; // NO

const [marketPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("market"), new BN(marketId).toArrayLike(Buffer, "le", 8)],
  PROGRAM_ID
);
const [vaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), marketPda.toBuffer()], PROGRAM_ID
);
const [betPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("bet"), marketPda.toBuffer(), wallet.publicKey.toBuffer()], PROGRAM_ID
);
const [reputationPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("reputation"), wallet.publicKey.toBuffer()], PROGRAM_ID
);
const [protocolPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("protocol")], PROGRAM_ID
);

async function main() {
  console.log("Bettor:", wallet.publicKey.toBase58());
  console.log("Market PDA:", marketPda.toBase58());
  console.log("Betting 0.05 SOL on NO for market 2 (ETH above $4000)");
  
  const tx = await program.methods
    .placeBet(amount, position)
    .accounts({
      bettor: wallet.publicKey,
      market: marketPda,
      bet: betPda,
      vault: vaultPda,
      reputation: reputationPda,
      protocol: protocolPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();
  
  console.log("Transaction:", tx);
  console.log("Bet placed successfully!");
}

main().catch(console.error);
