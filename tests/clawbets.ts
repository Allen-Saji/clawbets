import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Clawbets } from "../target/types/clawbets";
import { expect } from "chai";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

describe("clawbets", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Clawbets as Program<Clawbets>;
  const admin = provider.wallet;

  const bettor1 = Keypair.generate();
  const bettor2 = Keypair.generate();

  let protocolPda: PublicKey;
  let marketPda: PublicKey;
  let vaultPda: PublicKey;
  let mockOracle: Keypair;

  let marketDeadline: number;
  let marketResDeadline: number;

  before(async () => {
    [protocolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      program.programId
    );

    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), new anchor.BN(0).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );

    // Airdrop to test accounts
    for (const kp of [bettor1, bettor2]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    // Create mock oracle
    mockOracle = Keypair.generate();
    const space = 3312;
    const lamports =
      await provider.connection.getMinimumBalanceForRentExemption(space);
    const createIx = SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mockOracle.publicKey,
      lamports,
      space,
      programId: SystemProgram.programId,
    });
    const tx = new anchor.web3.Transaction().add(createIx);
    await provider.sendAndConfirm(tx, [mockOracle]);
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
    marketDeadline = now + 5; // 5 seconds for testing
    marketResDeadline = now + 60;

    const [reputationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), admin.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createMarket(
        "SOL above $250?",
        "Will SOL be above $250 by deadline?",
        mockOracle.publicKey,
        new anchor.BN(25000000000),
        true,
        new anchor.BN(marketDeadline),
        new anchor.BN(marketResDeadline),
        new anchor.BN(0.1 * LAMPORTS_PER_SOL),
        new anchor.BN(5 * LAMPORTS_PER_SOL)
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
      .placeBet(new anchor.BN(betAmount), true)
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
      .placeBet(new anchor.BN(betAmount), false)
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

    const market = await program.account.market.fetch(marketPda);
    expect(market.totalNo.toNumber()).to.equal(betAmount);
    expect(market.noCount).to.equal(1);
  });

  it("Rejects bet below minimum", async () => {
    const tinyBettor = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      tinyBettor.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const [betPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        marketPda.toBuffer(),
        tinyBettor.publicKey.toBuffer(),
      ],
      program.programId
    );
    const [reputationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), tinyBettor.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .placeBet(new anchor.BN(1000), true)
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
    expect(rep.totalWagered.toNumber()).to.equal(LAMPORTS_PER_SOL);
  });

  it("Cannot cancel market with existing bets", async () => {
    try {
      await program.methods
        .cancelMarket()
        .accounts({
          creator: admin.publicKey,
          market: marketPda,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("MarketHasBets");
    }
  });

  it("Vault holds escrowed SOL", async () => {
    const vaultBalance = await provider.connection.getBalance(vaultPda);
    expect(vaultBalance).to.equal(1.5 * LAMPORTS_PER_SOL);
  });
});
