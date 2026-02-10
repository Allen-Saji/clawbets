import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import idl from "../../../target/idl/clawbets.json";

// Configuration
const RPC_URL = process.env.SOLANA_RPC_URL || "http://localhost:8899";
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || idl.address
);

// Connection
const connection = new Connection(RPC_URL, "confirmed");

// Load admin wallet for protocol operations
function getAdminKeypair(): Keypair {
  const secretKey = process.env.ADMIN_SECRET_KEY;
  if (!secretKey) {
    throw new Error("ADMIN_SECRET_KEY not set");
  }
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(secretKey))
  );
}

function getProvider(): anchor.AnchorProvider {
  const wallet = new anchor.Wallet(getAdminKeypair());
  return new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
}

function getProgram(): anchor.Program {
  const provider = getProvider();
  return new anchor.Program(idl as any, provider);
}

// PDA derivations
function getProtocolPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    PROGRAM_ID
  );
}

function getMarketPda(marketId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), new anchor.BN(marketId).toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
}

function getVaultPda(marketPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketPubkey.toBuffer()],
    PROGRAM_ID
  );
}

function getBetPda(marketPubkey: PublicKey, bettorPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bet"), marketPubkey.toBuffer(), bettorPubkey.toBuffer()],
    PROGRAM_ID
  );
}

function getReputationPda(agentPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), agentPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export {
  connection,
  getProvider,
  getProgram,
  getAdminKeypair,
  getProtocolPda,
  getMarketPda,
  getVaultPda,
  getBetPda,
  getReputationPda,
  PROGRAM_ID,
  RPC_URL,
};
