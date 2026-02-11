const anchor = require("@coral-xyz/anchor");
const { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");

const idl = JSON.parse(fs.readFileSync("./target/idl/clawbets.json", "utf8"));

// Pyth Hermes feed IDs (real mainnet prices!)
const FEEDS = {
  "SOL/USD": "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  "BTC/USD": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "ETH/USD": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "BONK/USD": "72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419",
  "TRUMP/USD": "879551021853eec7a7dc827578e8e69da7e4fa8148339aa0d3d5296405be4b1a",
};

function hexToBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
  return bytes;
}

const AGENT_NAMES = [
  "AlphaBot", "BetaTrader", "GammaOracle", "DeltaHedge", "EpsilonAI",
  "ZetaPredict", "EtaSignal", "ThetaEdge", "IotaQuant", "KappaVault"
];

const MARKET_IDEAS = [
  { title: "SOL above $220 in 24h?", desc: "Will SOL break $220 within 24 hours? Resolves via Pyth SOL/USD.", feed: "SOL/USD", target: 22000000000, above: true },
  { title: "BTC above $110K this week?", desc: "Bitcoin price prediction. Resolves via Pyth BTC/USD.", feed: "BTC/USD", target: 11000000000000, above: true },
  { title: "ETH above $4000?", desc: "Ethereum breaks $4K? Resolves via Pyth ETH/USD.", feed: "ETH/USD", target: 400000000000, above: true },
  { title: "SOL drops below $180?", desc: "Bear case: SOL falls under $180.", feed: "SOL/USD", target: 18000000000, above: false },
  { title: "TRUMP above $50?", desc: "TRUMP token prediction. Resolves via Pyth TRUMP/USD.", feed: "TRUMP/USD", target: 5000000000, above: true },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

  // Load agents
  const agents = [];
  for (let i = 0; i < 10; i++) {
    const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(`./agents/agent-${i}.json`, "utf8"))));
    agents.push({ name: AGENT_NAMES[i], kp });
  }

  // Admin
  const adminKp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync("/root/.config/solana/id.json", "utf8"))));
  const adminWallet = new anchor.Wallet(adminKp);
  const adminProvider = new anchor.AnchorProvider(connection, adminWallet, { commitment: "confirmed" });
  const adminProgram = new anchor.Program(idl, adminProvider);
  const [protocolPda] = PublicKey.findProgramAddressSync([Buffer.from("protocol")], adminProgram.programId);

  // Fund agents
  console.log("=== FUNDING AGENTS ===\n");
  for (const agent of agents) {
    const bal = await connection.getBalance(agent.kp.publicKey);
    if (bal >= 0.08 * LAMPORTS_PER_SOL) {
      console.log(`  ${agent.name}: ${(bal / LAMPORTS_PER_SOL).toFixed(3)} SOL ✓`);
      continue;
    }
    try {
      const tx = new anchor.web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: adminKp.publicKey,
          toPubkey: agent.kp.publicKey,
          lamports: 0.1 * LAMPORTS_PER_SOL,
        })
      );
      await anchor.web3.sendAndConfirmTransaction(connection, tx, [adminKp]);
      console.log(`  ${agent.name}: funded 0.1 SOL`);
    } catch (e) {
      console.log(`  ${agent.name}: funding failed — ${e.message.slice(0, 80)}`);
    }
    await sleep(500);
  }

  // Create markets
  console.log("\n🚀 SWARM ACTIVATED\n");
  console.log("=== AGENTS CREATING MARKETS ===\n");

  const protocol = await adminProgram.account.protocol.fetch(protocolPda);
  let nextMarketId = protocol.marketCount.toNumber();

  for (let i = 0; i < 5; i++) {
    const agent = agents[i];
    const market = MARKET_IDEAS[i];
    const wallet = new anchor.Wallet(agent.kp);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new anchor.Program(idl, provider);

    const feedIdBytes = hexToBytes(FEEDS[market.feed]);
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
          market.title, market.desc, feedIdBytes,
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
      console.log(`  🟢 ${agent.name} created: "${market.title}" [${market.feed}] (market #${nextMarketId})`);
      nextMarketId++;
    } catch (e) {
      console.log(`  🔴 ${agent.name} create failed: ${e.message.slice(0, 150)}`);
    }
    await sleep(rand(2000, 4000));
  }

  // Place bets
  console.log("\n=== AGENTS PLACING BETS ===\n");

  const allMarkets = await adminProgram.account.market.all();
  const openMarkets = allMarkets.filter(m => Object.keys(m.account.status)[0] === "open");
  console.log(`  ${openMarkets.length} open markets found\n`);

  for (const agent of agents) {
    const numBets = rand(2, Math.min(4, openMarkets.length));
    const shuffled = [...openMarkets].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, numBets);

    const wallet = new anchor.Wallet(agent.kp);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new anchor.Program(idl, provider);

    for (const m of targets) {
      const marketPda = m.publicKey;
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), marketPda.toBuffer()], program.programId
      );
      const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), marketPda.toBuffer(), agent.kp.publicKey.toBuffer()], program.programId
      );
      const [repPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("reputation"), agent.kp.publicKey.toBuffer()], program.programId
      );

      try { await program.account.bet.fetch(betPda); continue; } catch {}

      const position = Math.random() > 0.5;
      const amounts = [0.01, 0.02, 0.03, 0.04, 0.05];
      const amount = amounts[rand(0, amounts.length - 1)];

      try {
        await program.methods
          .placeBet(new anchor.BN(amount * LAMPORTS_PER_SOL), position)
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
        console.log(`  🎲 ${agent.name} bet ${amount} SOL ${position ? "YES" : "NO"} on "${m.account.title}"`);
      } catch (e) {
        console.log(`  ❌ ${agent.name} bet failed: ${e.message.slice(0, 120)}`);
      }
      await sleep(rand(2000, 5000));
    }
  }

  console.log("\n=== SWARM COMPLETE ===\n");
  const finalProtocol = await adminProgram.account.protocol.fetch(protocolPda);
  console.log(`  Total markets: ${finalProtocol.marketCount.toNumber()}`);
  console.log(`  Total volume: ${(finalProtocol.totalVolume.toNumber() / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
  console.log("\n  Check the UI! 🔥\n");
}

main().catch(console.error);
