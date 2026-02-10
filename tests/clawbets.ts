import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Clawbets } from "../target/types/clawbets";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("clawbets", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Clawbets as Program<Clawbets>;
  const admin = provider.wallet;

  // Test accounts
  const bettor1 = Keypair.generate();
  const bettor2 = Keypair.generate();

  // PDAs
  let protocolPda: PublicKey;
  let protocolBump: number;
  let marketPda: PublicKey;
  let marketBump: number;
  let vaultPda: PublicKey;
  let vaultBump: number;

  // Mock oracle account - we'll create a fake one for testing
  let mockOracle: Keypair;

  before(async () => {
    // Derive PDAs
    [protocolPda, protocolBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      program.programId
    );

    [marketPda, marketBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), new anchor.BN(0).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );

    // Airdrop SOL to test accounts
    const sig1 = await provider.connection.requestAirdrop(
      bettor1.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig1);

    const sig2 = await provider.connection.requestAirdrop(
      bettor2.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig2);

    // Create mock oracle account with fake price data
    mockOracle = Keypair.generate();
    await createMockOracleAccount(provider, mockOracle, 25000000000, -8); // $250.00
  });

  it("Initializes the protocol", async () => {
    await program.methods
      .initialize()
      .accounts({
        admin: admin.publicKey,
        protocol: protocolPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const protocol = await program.account.protocol.fetch(protocolPda);
    expect(protocol.admin.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(protocol.marketCount.toNumber()).to.equal(0);
    expect(protocol.totalVolume.toNumber()).to.equal(0);
  });

  it("Creates a market", async () => {
    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 60; // 60 seconds from now
    const resolutionDeadline = now + 120; // 120 seconds from now

    const [reputationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), admin.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createMarket(
        "SOL above $250?",
        "Will SOL be above $250 by deadline?",
        mockOracle.publicKey,
        new anchor.BN(25000000000), // $250 in Pyth format (price * 10^8)
        true, // target_above
        new anchor.BN(deadline),
        new anchor.BN(resolutionDeadline),
        new anchor.BN(0.1 * LAMPORTS_PER_SOL), // min bet 0.1 SOL
        new anchor.BN(5 * LAMPORTS_PER_SOL) // max bet 5 SOL
      )
      .accounts({
        creator: admin.publicKey,
        protocol: protocolPda,
        market: marketPda,
        vault: vaultPda,
        reputation: reputationPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    expect(market.title).to.equal("SOL above $250?");
    expect(market.totalYes.toNumber()).to.equal(0);
    expect(market.totalNo.toNumber()).to.equal(0);
    expect(market.status).to.deep.equal({ open: {} });

    const protocol = await program.account.protocol.fetch(protocolPda);
    expect(protocol.marketCount.toNumber()).to.equal(1);
  });

  it("Places a YES bet", async () => {
    const betAmount = 1 * LAMPORTS_PER_SOL;

    const [betPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), marketPda.toBuffer(), bettor1.publicKey.toBuffer()],
      program.programId
    );

    const [reputationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), bettor1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .placeBet(new anchor.BN(betAmount), true) // YES
      .accounts({
        bettor: bettor1.publicKey,
        market: marketPda,
        bet: betPda,
        vault: vaultPda,
        reputation: reputationPda,
        protocol: protocolPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([bettor1])
      .rpc();

    const bet = await program.account.bet.fetch(betPda);
    expect(bet.position).to.equal(true);
    expect(bet.amount.toNumber()).to.equal(betAmount);
    expect(bet.claimed).to.equal(false);

    const market = await program.account.market.fetch(marketPda);
    expect(market.totalYes.toNumber()).to.equal(betAmount);
    expect(market.yesCount).to.equal(1);
  });

  it("Places a NO bet", async () => {
    const betAmount = 0.5 * LAMPORTS_PER_SOL;

    const [betPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), marketPda.toBuffer(), bettor2.publicKey.toBuffer()],
      program.programId
    );

    const [reputationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), bettor2.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .placeBet(new anchor.BN(betAmount), false) // NO
      .accounts({
        bettor: bettor2.publicKey,
        market: marketPda,
        bet: betPda,
        vault: vaultPda,
        reputation: reputationPda,
        protocol: protocolPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([bettor2])
      .rpc();

    const bet = await program.account.bet.fetch(betPda);
    expect(bet.position).to.equal(false);
    expect(bet.amount.toNumber()).to.equal(betAmount);

    const market = await program.account.market.fetch(marketPda);
    expect(market.totalNo.toNumber()).to.equal(betAmount);
    expect(market.noCount).to.equal(1);
  });

  it("Rejects bet below minimum", async () => {
    const tinyBettor = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      tinyBettor.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const [betPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), marketPda.toBuffer(), tinyBettor.publicKey.toBuffer()],
      program.programId
    );

    const [reputationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), tinyBettor.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .placeBet(new anchor.BN(1000), true) // Way below min
        .accounts({
          bettor: tinyBettor.publicKey,
          market: marketPda,
          bet: betPda,
          vault: vaultPda,
          reputation: reputationPda,
          protocol: protocolPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([tinyBettor])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("BetTooSmall");
    }
  });

  it("Fetches reputation", async () => {
    const [reputationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), bettor1.publicKey.toBuffer()],
      program.programId
    );

    const rep = await program.account.agentReputation.fetch(reputationPda);
    expect(rep.totalBets).to.equal(1);
    expect(rep.totalWagered.toNumber()).to.equal(1 * LAMPORTS_PER_SOL);
  });
});

// Helper: Create a mock Pyth oracle account with a given price
async function createMockOracleAccount(
  provider: anchor.AnchorProvider,
  oracle: Keypair,
  price: number,
  expo: number
) {
  // Pyth V2 price account is ~3312 bytes
  // We need to write price at offset 208, conf at 216, publish_time at 224, expo at 232
  const space = 3312;
  const lamports = await provider.connection.getMinimumBalanceForRentExemption(space);

  const createIx = SystemProgram.createAccount({
    fromPubkey: provider.wallet.publicKey,
    newAccountPubkey: oracle.publicKey,
    lamports,
    space,
    programId: SystemProgram.programId, // owned by system for now
  });

  const tx = new anchor.web3.Transaction().add(createIx);
  await provider.sendAndConfirm(tx, [oracle]);

  // Note: For full integration tests, we'd use a proper Pyth mock.
  // For localnet testing, we'll test the contract logic with a mock resolver approach.
}
