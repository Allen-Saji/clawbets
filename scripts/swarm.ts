import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as fs from "fs";

const idl = JSON.parse(fs.readFileSync("./target/idl/clawbets.json", "utf8"));
const PYTH_SOL_USD = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");

const AGENT_NAMES = [
  "AlphaBot", "BetaTrader", "GammaOracle", "DeltaHedge", "EpsilonAI",
  "ZetaPredict", "EtaSignal", "ThetaEdge", "IotaQuant", "KappaVault"
];

const MARKET_IDEAS = [
  { title: "SOL above $220 in 24h?", desc: "Will SOL break $220 within 24 hours?", target: 22000000000, above: true },
  { title: "SOL above $250 by end of week?", desc: "SOL price prediction for the week.", target: 25000000000, above: true },
  { title: "SOL drops below $180?", desc: "Bear case: SOL falls under $180.", target: 18000000000, above: false },
  { title: "SOL above $300 by March?", desc: "Bullish long-term SOL prediction.", target: 30000000000, above: true },
  { title: "SOL stays above $200?", desc: "SOL holds support above $200.", target: 20000000000, above: true },
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

  // Load admin keypair
  const adminKp = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/root/.config/solana/id.json", "utf8")))
  );
  const adminWallet = new anchor.Wallet(adminKp);
  const adminProvider = new anchor.AnchorProvider(connection, adminWallet, { commitment: "confirmed" });
  const adminProgram = new anchor.Program(idl, adminProvider);

  const [protocolPda] = PublicKey.findProgramAddressSync([Buffer.from("protocol")], adminProgram.programId);

  // === STEP 1: Generate or load 10 agent keypairs ===
  console.log("=== GENERATING 10 AGENT WALLETS ===\n");
  const agents: { name: string; kp: Keypair }[] = [];
  const agentsDir = "./agents";
  if (!fs.existsSync(agentsDir)) fs.mkdirSync(agentsDir);

  for (let i = 0; i < 10; i++) {
    const path = `${agentsDir}/agent-${i}.json`;
    let kp: Keypair;
    if (fs.existsSync(path)) {
      kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
    } else {
      kp = Keypair.generate();
      fs.writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
    }
    agents.push({ name: AGENT_NAMES[i], kp });
    console.log(`  ${AGENT_NAMES[i]}: ${kp.publicKey.toBase58()}`);
  }

  // === STEP 2: Fund agents from admin (0.15 SOL each) ===
  console.log("\n=== FUNDING AGENTS (0.15 SOL each) ===\n");
  for (const agent of agents) {
    const bal = await connection.getBalance(agent.kp.publicKey);
    if (bal >= 0.1 * LAMPORTS_PER_SOL) {
      console.log(`  ${agent.name}: already has ${(bal / LAMPORTS_PER_SOL).toFixed(3)} SOL, skipping`);
      continue;
    }
    try {
      const tx = new anchor.web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: adminKp.publicKey,
          toPubkey: agent.kp.publicKey,
          lamports: 0.15 * LAMPORTS_PER_SOL,
        })
      );
      const sig = await anchor.web3.sendAndConfirmTransaction(connection, tx, [adminKp]);
      console.log(`  ${agent.name}: funded 0.15 SOL — ${sig.slice(0, 20)}...`);
    } catch (e: any) {
      console.log(`  ${agent.name}: funding failed — ${e.message.slice(0, 100)}`);
    }
    await sleep(500);
  }

  console.log("\n=== SETUP COMPLETE. WAITING FOR 'START' SIGNAL... ===");
  console.log("Press ENTER to begin the swarm!\n");

  await new Promise<void>(resolve => {
    process.stdin.once("data", () => resolve());
  });

  // === STEP 3: Agents create markets (first 5 agents each create 1) ===
  console.log("=== AGENTS CREATING MARKETS ===\n");

  const protocol = await (adminProgram.account as any).protocol.fetch(protocolPda);
  let nextMarketId = protocol.marketCount.toNumber();

  for (let i = 0; i < 5; i++) {
    const agent = agents[i];
    const market = MARKET_IDEAS[i];
    const wallet = new anchor.Wallet(agent.kp);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new anchor.Program(idl, provider);

    const marketIdBN = new anchor.BN(nextMarketId);
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketIdBN.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );
    const [repPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), agent.kp.publicKey.toBuffer()],
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 86400;
    const resDeadline = now + 172800;

    try {
      const tx = await program.methods
        .createMarket(
          market.title, market.desc, PYTH_SOL_USD,
          new anchor.BN(market.target), market.above,
          new anchor.BN(deadline), new anchor.BN(resDeadline),
          new anchor.BN(0.01 * LAMPORTS_PER_SOL),
          new anchor.BN(5 * LAMPORTS_PER_SOL)
        )
        .accounts({
          creator: agent.kp.publicKey,
          protocol: protocolPda,
          market: marketPda,
          vault: vaultPda,
          reputation: repPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(`  🟢 ${agent.name} created: "${market.title}" (market #${nextMarketId}) — ${tx.slice(0, 20)}...`);
      nextMarketId++;
    } catch (e: any) {
      console.log(`  🔴 ${agent.name} create failed: ${e.message.slice(0, 150)}`);
    }
    await sleep(rand(1000, 3000)); // Stagger for realism
  }

  // === STEP 4: All 10 agents bet on random markets ===
  console.log("\n=== AGENTS PLACING BETS ===\n");

  // Fetch all open markets
  const allMarkets = await (adminProgram.account as any).market.all();
  const openMarkets = allMarkets.filter((m: any) => Object.keys(m.account.status)[0] === "open");
  console.log(`  Found ${openMarkets.length} open markets\n`);

  for (const agent of agents) {
    // Each agent bets on 2-4 random markets
    const numBets = rand(2, Math.min(4, openMarkets.length));
    const shuffled = [...openMarkets].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, numBets);

    const wallet = new anchor.Wallet(agent.kp);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new anchor.Program(idl, provider);

    for (const m of targets) {
      const marketPda = m.publicKey;
      const marketIdBN = new anchor.BN(m.account.marketId.toString());

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), marketPda.toBuffer()],
        program.programId
      );
      const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), marketPda.toBuffer(), agent.kp.publicKey.toBuffer()],
        program.programId
      );
      const [repPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("reputation"), agent.kp.publicKey.toBuffer()],
        program.programId
      );

      // Check if already bet
      try {
        await (program.account as any).bet.fetch(betPda);
        continue; // already bet
      } catch {}

      const position = Math.random() > 0.5;
      // Small bets: 0.01 - 0.05 SOL
      const amounts = [0.01, 0.02, 0.03, 0.04, 0.05];
      const amount = amounts[rand(0, amounts.length - 1)];
      const amountBN = new anchor.BN(amount * LAMPORTS_PER_SOL);

      try {
        const tx = await program.methods
          .placeBet(amountBN, position)
          .accounts({
            bettor: agent.kp.publicKey,
            market: marketPda,
            bet: betPda,
            vault: vaultPda,
            reputation: repPda,
            protocol: protocolPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log(`  🎲 ${agent.name} bet ${amount} SOL ${position ? "YES" : "NO"} on "${m.account.title}" — ${tx.slice(0, 20)}...`);
      } catch (e: any) {
        console.log(`  ❌ ${agent.name} bet failed on "${m.account.title}": ${e.message.slice(0, 120)}`);
      }
      await sleep(rand(1500, 4000)); // Stagger for realism
    }
  }

  console.log("\n=== SWARM COMPLETE ===");
  console.log("Check the UI to see all activity!");

  // Print summary
  const finalProtocol = await (adminProgram.account as any).protocol.fetch(protocolPda);
  console.log(`\nTotal markets: ${finalProtocol.marketCount.toNumber()}`);
  console.log(`Total volume: ${finalProtocol.totalVolume.toNumber() / LAMPORTS_PER_SOL} SOL`);
}

main().catch(console.error);
