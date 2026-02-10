import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import * as fs from "fs";

const idl = JSON.parse(fs.readFileSync("./target/idl/clawbets.json", "utf8"));
const PYTH_SOL_USD_DEVNET = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");
const PYTH_BTC_USD_DEVNET = new PublicKey("HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J");
const PYTH_ETH_USD_DEVNET = new PublicKey("EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw");

interface MarketConfig {
  title: string;
  description: string;
  oracle: PublicKey;
  targetPrice: number;
  targetAbove: boolean;
  deadlineHours: number;
  minBet: number;
  maxBet: number;
}

const markets: MarketConfig[] = [
  {
    title: "BTC above $100k by tomorrow?",
    description: "Will Bitcoin exceed $100,000 in the next 24 hours? Resolves via Pyth BTC/USD oracle.",
    oracle: PYTH_BTC_USD_DEVNET,
    targetPrice: 10000000000000, // $100,000 * 10^8
    targetAbove: true,
    deadlineHours: 24,
    minBet: 0.05,
    maxBet: 5,
  },
  {
    title: "ETH above $4000 this week?",
    description: "Will Ethereum price be above $4,000 within the next 3 days? Resolves via Pyth ETH/USD oracle.",
    oracle: PYTH_ETH_USD_DEVNET,
    targetPrice: 400000000000, // $4,000 * 10^8
    targetAbove: true,
    deadlineHours: 72,
    minBet: 0.01,
    maxBet: 10,
  },
  {
    title: "SOL above $300 in 48h?",
    description: "Will Solana's price break $300 in the next 48 hours? Resolves via Pyth SOL/USD oracle.",
    oracle: PYTH_SOL_USD_DEVNET,
    targetPrice: 30000000000, // $300 * 10^8
    targetAbove: true,
    deadlineHours: 48,
    minBet: 0.01,
    maxBet: 10,
  },
];

async function main() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const keypairData = fs.readFileSync("/root/.config/solana/id.json", "utf8");
  const keypair = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairData)));
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new anchor.Program(idl, provider);

  const [protocolPda] = PublicKey.findProgramAddressSync([Buffer.from("protocol")], program.programId);

  for (const m of markets) {
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

    console.log(`Creating market ${marketId}: "${m.title}"...`);

    const tx = await program.methods
      .createMarket(
        m.title,
        m.description,
        m.oracle,
        new anchor.BN(m.targetPrice),
        m.targetAbove,
        new anchor.BN(now + m.deadlineHours * 3600),
        new anchor.BN(now + m.deadlineHours * 3600 + 86400),
        new anchor.BN(Math.floor(m.minBet * 1e9)),
        new anchor.BN(Math.floor(m.maxBet * 1e9))
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

    console.log(`  ✅ Created! TX: ${tx.slice(0, 20)}...`);

    // Wait a bit between transactions
    await new Promise((r) => setTimeout(r, 1000));
  }

  const protocol = await (program.account as any).protocol.fetch(protocolPda);
  console.log(`\nTotal markets: ${protocol.marketCount.toNumber()}`);
  console.log(`Balance: ${(await connection.getBalance(wallet.publicKey)) / 1e9} SOL`);
}

main().catch(console.error);
