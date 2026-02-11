var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/swarm.ts
var anchor = __toESM(require("@coral-xyz/anchor"));
var import_web3 = require("@solana/web3.js");
var fs = __toESM(require("fs"));
var idl = JSON.parse(fs.readFileSync("./target/idl/clawbets.json", "utf8"));
var PYTH_SOL_USD = new import_web3.PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");
var AGENT_NAMES = [
  "AlphaBot",
  "BetaTrader",
  "GammaOracle",
  "DeltaHedge",
  "EpsilonAI",
  "ZetaPredict",
  "EtaSignal",
  "ThetaEdge",
  "IotaQuant",
  "KappaVault"
];
var MARKET_IDEAS = [
  { title: "SOL above $220 in 24h?", desc: "Will SOL break $220 within 24 hours?", target: 22e9, above: true },
  { title: "SOL above $250 by end of week?", desc: "SOL price prediction for the week.", target: 25e9, above: true },
  { title: "SOL drops below $180?", desc: "Bear case: SOL falls under $180.", target: 18e9, above: false },
  { title: "SOL above $300 by March?", desc: "Bullish long-term SOL prediction.", target: 3e10, above: true },
  { title: "SOL stays above $200?", desc: "SOL holds support above $200.", target: 2e10, above: true }
];
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function main() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const adminKp = import_web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/root/.config/solana/id.json", "utf8")))
  );
  const adminWallet = new anchor.Wallet(adminKp);
  const adminProvider = new anchor.AnchorProvider(connection, adminWallet, { commitment: "confirmed" });
  const adminProgram = new anchor.Program(idl, adminProvider);
  const [protocolPda] = import_web3.PublicKey.findProgramAddressSync([Buffer.from("protocol")], adminProgram.programId);
  console.log("=== GENERATING 10 AGENT WALLETS ===\n");
  const agents = [];
  const agentsDir = "./agents";
  if (!fs.existsSync(agentsDir)) fs.mkdirSync(agentsDir);
  for (let i = 0; i < 10; i++) {
    const path = `${agentsDir}/agent-${i}.json`;
    let kp;
    if (fs.existsSync(path)) {
      kp = import_web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
    } else {
      kp = import_web3.Keypair.generate();
      fs.writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
    }
    agents.push({ name: AGENT_NAMES[i], kp });
    console.log(`  ${AGENT_NAMES[i]}: ${kp.publicKey.toBase58()}`);
  }
  console.log("\n=== FUNDING AGENTS (0.15 SOL each) ===\n");
  for (const agent of agents) {
    const bal = await connection.getBalance(agent.kp.publicKey);
    if (bal >= 0.1 * import_web3.LAMPORTS_PER_SOL) {
      console.log(`  ${agent.name}: already has ${(bal / import_web3.LAMPORTS_PER_SOL).toFixed(3)} SOL, skipping`);
      continue;
    }
    try {
      const tx = new anchor.web3.Transaction().add(
        import_web3.SystemProgram.transfer({
          fromPubkey: adminKp.publicKey,
          toPubkey: agent.kp.publicKey,
          lamports: 0.15 * import_web3.LAMPORTS_PER_SOL
        })
      );
      const sig = await anchor.web3.sendAndConfirmTransaction(connection, tx, [adminKp]);
      console.log(`  ${agent.name}: funded 0.15 SOL \u2014 ${sig.slice(0, 20)}...`);
    } catch (e) {
      console.log(`  ${agent.name}: funding failed \u2014 ${e.message.slice(0, 100)}`);
    }
    await sleep(500);
  }
  console.log("\n=== SETUP COMPLETE. WAITING FOR 'START' SIGNAL... ===");
  console.log("Press ENTER to begin the swarm!\n");
  await new Promise((resolve) => {
    process.stdin.once("data", () => resolve());
  });
  console.log("=== AGENTS CREATING MARKETS ===\n");
  const protocol = await adminProgram.account.protocol.fetch(protocolPda);
  let nextMarketId = protocol.marketCount.toNumber();
  for (let i = 0; i < 5; i++) {
    const agent = agents[i];
    const market = MARKET_IDEAS[i];
    const wallet = new anchor.Wallet(agent.kp);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new anchor.Program(idl, provider);
    const marketIdBN = new anchor.BN(nextMarketId);
    const [marketPda] = import_web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketIdBN.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [vaultPda] = import_web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );
    const [repPda] = import_web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), agent.kp.publicKey.toBuffer()],
      program.programId
    );
    const now = Math.floor(Date.now() / 1e3);
    const deadline = now + 86400;
    const resDeadline = now + 172800;
    try {
      const tx = await program.methods.createMarket(
        market.title,
        market.desc,
        PYTH_SOL_USD,
        new anchor.BN(market.target),
        market.above,
        new anchor.BN(deadline),
        new anchor.BN(resDeadline),
        new anchor.BN(0.01 * import_web3.LAMPORTS_PER_SOL),
        new anchor.BN(5 * import_web3.LAMPORTS_PER_SOL)
      ).accounts({
        creator: agent.kp.publicKey,
        protocol: protocolPda,
        market: marketPda,
        vault: vaultPda,
        reputation: repPda,
        systemProgram: import_web3.SystemProgram.programId
      }).rpc();
      console.log(`  \u{1F7E2} ${agent.name} created: "${market.title}" (market #${nextMarketId}) \u2014 ${tx.slice(0, 20)}...`);
      nextMarketId++;
    } catch (e) {
      console.log(`  \u{1F534} ${agent.name} create failed: ${e.message.slice(0, 150)}`);
    }
    await sleep(rand(1e3, 3e3));
  }
  console.log("\n=== AGENTS PLACING BETS ===\n");
  const allMarkets = await adminProgram.account.market.all();
  const openMarkets = allMarkets.filter((m) => Object.keys(m.account.status)[0] === "open");
  console.log(`  Found ${openMarkets.length} open markets
`);
  for (const agent of agents) {
    const numBets = rand(2, Math.min(4, openMarkets.length));
    const shuffled = [...openMarkets].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, numBets);
    const wallet = new anchor.Wallet(agent.kp);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new anchor.Program(idl, provider);
    for (const m of targets) {
      const marketPda = m.publicKey;
      const marketIdBN = new anchor.BN(m.account.marketId.toString());
      const [vaultPda] = import_web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), marketPda.toBuffer()],
        program.programId
      );
      const [betPda] = import_web3.PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), marketPda.toBuffer(), agent.kp.publicKey.toBuffer()],
        program.programId
      );
      const [repPda] = import_web3.PublicKey.findProgramAddressSync(
        [Buffer.from("reputation"), agent.kp.publicKey.toBuffer()],
        program.programId
      );
      try {
        await program.account.bet.fetch(betPda);
        continue;
      } catch {
      }
      const position = Math.random() > 0.5;
      const amounts = [0.01, 0.02, 0.03, 0.04, 0.05];
      const amount = amounts[rand(0, amounts.length - 1)];
      const amountBN = new anchor.BN(amount * import_web3.LAMPORTS_PER_SOL);
      try {
        const tx = await program.methods.placeBet(amountBN, position).accounts({
          bettor: agent.kp.publicKey,
          market: marketPda,
          bet: betPda,
          vault: vaultPda,
          reputation: repPda,
          protocol: protocolPda,
          systemProgram: import_web3.SystemProgram.programId
        }).rpc();
        console.log(`  \u{1F3B2} ${agent.name} bet ${amount} SOL ${position ? "YES" : "NO"} on "${m.account.title}" \u2014 ${tx.slice(0, 20)}...`);
      } catch (e) {
        console.log(`  \u274C ${agent.name} bet failed on "${m.account.title}": ${e.message.slice(0, 120)}`);
      }
      await sleep(rand(1500, 4e3));
    }
  }
  console.log("\n=== SWARM COMPLETE ===");
  console.log("Check the UI to see all activity!");
  const finalProtocol = await adminProgram.account.protocol.fetch(protocolPda);
  console.log(`
Total markets: ${finalProtocol.marketCount.toNumber()}`);
  console.log(`Total volume: ${finalProtocol.totalVolume.toNumber() / import_web3.LAMPORTS_PER_SOL} SOL`);
}
main().catch(console.error);
