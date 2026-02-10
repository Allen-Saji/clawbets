import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";

const idl = JSON.parse(fs.readFileSync("./target/idl/clawbets.json", "utf8"));

async function main() {
  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const keypairData = fs.readFileSync("./agent2-keypair.json", "utf8");
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

  console.log(`Agent 2: ${keypair.publicKey.toBase58()}`);
  const bal = await connection.getBalance(keypair.publicKey);
  console.log(`Balance: ${bal / 1e9} SOL`);

  const markets = await (program.account as any).market.all();
  const openMarkets = markets.filter((m: any) => Object.keys(m.account.status)[0] === "open");
  console.log(`\nFound ${openMarkets.length} open markets\n`);

  for (const m of openMarkets) {
    const marketIdBN = new anchor.BN(m.account.marketId.toString());
    const marketId = marketIdBN.toNumber();
    const title = m.account.title;

    // Derive PDAs
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketIdBN.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );
    const [betPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), marketPda.toBuffer(), keypair.publicKey.toBuffer()],
      program.programId
    );
    const [reputationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), keypair.publicKey.toBuffer()],
      program.programId
    );

    // Check if already bet
    try {
      await (program.account as any).bet.fetch(betPda);
      console.log(`Market #${marketId} "${title}" — already bet, skipping`);
      continue;
    } catch {
      // No bet yet
    }

    // Alternate YES/NO: even = NO, odd = YES
    const position = marketId % 2 === 0 ? false : true;
    const betAmount = new anchor.BN("50000000"); // 0.05 SOL

    console.log(`Market #${marketId} "${title}" — betting ${position ? "YES" : "NO"} with 0.05 SOL...`);

    try {
      // IDL args order: amount (u64), position (bool)
      const tx = await program.methods
        .placeBet(betAmount, position)
        .accounts({
          bettor: keypair.publicKey,
          market: marketPda,
          bet: betPda,
          vault: vaultPda,
          reputation: reputationPda,
          protocol: protocolPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(`  ✅ TX: ${tx}`);
    } catch (err: any) {
      console.log(`  ❌ Error: ${err.message?.slice(0, 200)}`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
