const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, Keypair, Connection } = require("@solana/web3.js");
const { PythSolanaReceiver } = require("@pythnetwork/pyth-solana-receiver");
const fs = require("fs");

const RPC = "https://devnet.helius-rpc.com/?api-key=9adfab8a-9e5e-4c7e-aa3f-7ac2bbc980e7";
const FEED_HEX = "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
const HERMES_URL = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=0x${FEED_HEX}&encoding=base64`;

function hexToBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
  return bytes;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const keypairData = JSON.parse(fs.readFileSync("/root/.config/solana/id.json", "utf8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const idl = JSON.parse(fs.readFileSync("./target/idl/clawbets.json", "utf8"));
  const program = new anchor.Program(idl, provider);

  console.log("Program:", program.programId.toBase58());
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Balance:", (await connection.getBalance(wallet.publicKey)) / 1e9, "SOL");

  const [protocolPda] = PublicKey.findProgramAddressSync([Buffer.from("protocol")], program.programId);
  const protocol = await program.account.protocol.fetch(protocolPda);
  const marketId = protocol.marketCount;
  console.log("\n--- Step 1: Create Market (id:", marketId.toNumber(), ") ---");

  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketId.toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault"), marketPda.toBuffer()], program.programId);
  const [reputationPda] = PublicKey.findProgramAddressSync([Buffer.from("reputation"), wallet.publicKey.toBuffer()], program.programId);

  const now = Math.floor(Date.now() / 1000);
  const deadline = new anchor.BN(now + 15); // 15 seconds
  const resolutionDeadline = new anchor.BN(now + 600); // 10 minutes
  const feedId = hexToBytes(FEED_HEX);
  // Target: SOL above $1 (price in Pyth format with exponent -8, so 1 * 10^8 = 100000000)
  const targetPrice = new anchor.BN(100000000);
  const minBet = new anchor.BN(10000000); // 0.01 SOL
  const maxBet = new anchor.BN(1000000000); // 1 SOL

  const createTx = await program.methods
    .createMarket("Test SOL>$1", "Resolution test", feedId, targetPrice, true, deadline, resolutionDeadline, minBet, maxBet)
    .accounts({
      creator: wallet.publicKey,
      protocol: protocolPda,
      market: marketPda,
      vault: vaultPda,
      reputation: reputationPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("✅ Market created! TX:", createTx);

  // Step 2: Place a bet
  console.log("\n--- Step 2: Place Bet ---");
  const [betPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bet"), marketPda.toBuffer(), wallet.publicKey.toBuffer()],
    program.programId
  );
  const betTx = await program.methods
    .placeBet(new anchor.BN(10000000), true) // 0.01 SOL, YES
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
  console.log("✅ Bet placed! TX:", betTx);

  // Step 3: Wait for deadline
  const waitSec = deadline.toNumber() - Math.floor(Date.now() / 1000) + 2;
  if (waitSec > 0) {
    console.log(`\n--- Step 3: Waiting ${waitSec}s for deadline... ---`);
    await sleep(waitSec * 1000);
  }
  console.log("Deadline passed!");

  // Step 4: Fetch price update from Hermes
  console.log("\n--- Step 4: Fetch Pyth price update ---");
  const hermesResp = await fetch(HERMES_URL);
  const hermesData = await hermesResp.json();
  const priceVaa = hermesData.binary.data[0]; // base64 encoded VAA
  console.log("Got price update, publish_time:", hermesData.parsed[0].price.publish_time);
  console.log("SOL price:", hermesData.parsed[0].price.price * Math.pow(10, hermesData.parsed[0].price.expo));

  // Step 5: Post price update on-chain via Pyth Solana Receiver
  console.log("\n--- Step 5: Post price on-chain ---");
  const pythReceiver = new PythSolanaReceiver({ connection, wallet });
  
  const txBuilder = pythReceiver.newTransactionBuilder({ closeUpdateAccounts: false });
  await txBuilder.addPostPriceUpdates([priceVaa]);
  
  const txsWithAccounts = await txBuilder.buildVersionedTransactions({ 
    tightComputeBudget: true,
    jitoTipLamports: 0,
  });
  
  // Debug: inspect the structure
  let priceUpdateAccount = null;
  for (const item of txsWithAccounts) {
    console.log("  TX item keys:", Object.keys(item));
    // Try all possible ways to find the account
    if (item.priceFeedIdToPriceUpdateAccount) {
      for (const [k, v] of item.priceFeedIdToPriceUpdateAccount.entries()) {
        console.log("  Feed map:", k, "->", v?.toBase58?.() || v);
        priceUpdateAccount = v;
      }
    }
  }
  
  // Send the transactions
  const sigs = await pythReceiver.provider.sendAll(
    txsWithAccounts.map(({ tx, signers }) => ({ tx, signers })),
    { preflightCommitment: "confirmed" }
  );
  console.log("✅ Price posted! Sigs:", sigs);

  // If we still don't have the account, extract from the transaction instructions
  if (!priceUpdateAccount) {
    // The price update keypair is generated internally. Let's look at the transaction
    // to find accounts owned by the Pyth receiver program.
    // Pyth receiver program on devnet:
    const PYTH_RECEIVER = new PublicKey("rec5EKMGg6MxZYaMdyBps68Vw3xLhFBQCWjFGNPQuKS");
    
    // Search for accounts from tx signers - the price update account is a new keypair that signs the tx
    for (const item of txsWithAccounts) {
      if (item.signers) {
        for (const signer of item.signers) {
          if (signer.publicKey && !signer.publicKey.equals(wallet.publicKey)) {
            console.log("  Found signer:", signer.publicKey.toBase58());
            priceUpdateAccount = signer.publicKey;
          }
        }
      }
    }
  }
  console.log("Price update account:", priceUpdateAccount?.toBase58());

  if (!priceUpdateAccount) {
    throw new Error("Failed to get price update account");
  }

  // Wait for confirmation
  await sleep(2000);

  // Step 6: Resolve market
  console.log("\n--- Step 6: Resolve Market ---");
  const resolveTx = await program.methods
    .resolveMarket()
    .accounts({
      resolver: wallet.publicKey,
      market: marketPda,
      priceUpdate: priceUpdateAccount,
    })
    .rpc();
  console.log("✅ Market resolved! TX:", resolveTx);

  // Step 7: Verify
  console.log("\n--- Step 7: Verify Resolution ---");
  const market = await program.account.market.fetch(marketPda);
  console.log("Status:", JSON.stringify(market.status));
  console.log("Outcome:", market.outcome);
  console.log("Resolved price:", market.resolvedPrice?.toNumber());
  console.log("Resolved at:", market.resolvedAt?.toNumber());
  console.log("\n🎉 END-TO-END RESOLUTION TEST PASSED!");
}

main().catch(e => { console.error("❌ Error:", e); process.exit(1); });
