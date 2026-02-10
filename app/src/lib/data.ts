import { cache } from "react";
import { getProgram, getProtocolPda, getProgramId, getRpcUrl, getMarketPda, getVaultPda, getConnection } from "./solana";

// Server-side data functions — called directly by Server Components
// No HTTP round-trip, uses Anchor program client directly

export const fetchProtocol = cache(async () => {
  const program = getProgram();
  const [protocolPda] = getProtocolPda();
  const protocol = await (program.account as any).protocol.fetch(protocolPda);

  return {
    admin: protocol.admin.toBase58(),
    marketCount: protocol.marketCount.toNumber(),
    totalVolume: protocol.totalVolume.toNumber(),
    totalVolumeSol: protocol.totalVolume.toNumber() / 1e9,
    programId: getProgramId().toBase58(),
    rpcUrl: getRpcUrl(),
  };
});

export const fetchMarkets = cache(async () => {
  const program = getProgram();
  const markets = await (program.account as any).market.all();

  const formatted = markets.map((m: any) => ({
    publicKey: m.publicKey.toBase58(),
    marketId: m.account.marketId.toNumber(),
    creator: m.account.creator.toBase58(),
    title: m.account.title,
    description: m.account.description,
    oracleFeed: m.account.oracleFeed.toBase58(),
    targetPrice: m.account.targetPrice.toNumber(),
    targetAbove: m.account.targetAbove,
    deadline: m.account.deadline.toNumber(),
    resolutionDeadline: m.account.resolutionDeadline.toNumber(),
    minBet: m.account.minBet.toNumber(),
    maxBet: m.account.maxBet.toNumber(),
    totalYes: m.account.totalYes.toNumber(),
    totalNo: m.account.totalNo.toNumber(),
    totalYesSol: m.account.totalYes.toNumber() / 1e9,
    totalNoSol: m.account.totalNo.toNumber() / 1e9,
    yesCount: m.account.yesCount,
    noCount: m.account.noCount,
    status: Object.keys(m.account.status)[0],
    outcome: m.account.outcome,
    resolvedPrice: m.account.resolvedPrice ? m.account.resolvedPrice.toNumber() : null,
    resolvedAt: m.account.resolvedAt ? m.account.resolvedAt.toNumber() : null,
    createdAt: m.account.createdAt.toNumber(),
  }));

  formatted.sort((a: any, b: any) => b.createdAt - a.createdAt);
  return { markets: formatted, count: formatted.length };
});

export const fetchMarket = cache(async (marketId: number) => {
  const program = getProgram();
  const [marketPda] = getMarketPda(marketId);
  const [vaultPda] = getVaultPda(marketPda);

  const market = await (program.account as any).market.fetch(marketPda);
  const vaultBalance = await getConnection().getBalance(vaultPda);

  return {
    publicKey: marketPda.toBase58(),
    vault: vaultPda.toBase58(),
    vaultBalance,
    vaultBalanceSol: vaultBalance / 1e9,
    marketId: market.marketId.toNumber(),
    creator: market.creator.toBase58(),
    title: market.title,
    description: market.description,
    oracleFeed: market.oracleFeed.toBase58(),
    targetPrice: market.targetPrice.toNumber(),
    targetAbove: market.targetAbove,
    deadline: market.deadline.toNumber(),
    resolutionDeadline: market.resolutionDeadline.toNumber(),
    minBet: market.minBet.toNumber(),
    maxBet: market.maxBet.toNumber(),
    totalYes: market.totalYes.toNumber(),
    totalNo: market.totalNo.toNumber(),
    totalYesSol: market.totalYes.toNumber() / 1e9,
    totalNoSol: market.totalNo.toNumber() / 1e9,
    yesCount: market.yesCount,
    noCount: market.noCount,
    status: Object.keys(market.status)[0],
    outcome: market.outcome,
    resolvedPrice: market.resolvedPrice ? market.resolvedPrice.toNumber() : null,
    resolvedAt: market.resolvedAt ? market.resolvedAt.toNumber() : null,
    createdAt: market.createdAt.toNumber(),
  };
});

export const fetchMarketBets = cache(async (marketId: number) => {
  const program = getProgram();
  const [marketPda] = getMarketPda(marketId);

  const bets = await (program.account as any).bet.all([
    { memcmp: { offset: 8 + 32, bytes: marketPda.toBase58() } },
  ]);

  const formatted = bets.map((b: any) => ({
    publicKey: b.publicKey.toBase58(),
    bettor: b.account.bettor.toBase58(),
    market: b.account.market.toBase58(),
    amount: b.account.amount.toNumber(),
    amountSol: b.account.amount.toNumber() / 1e9,
    position: b.account.position ? "YES" : "NO",
    claimed: b.account.claimed,
    placedAt: b.account.placedAt.toNumber(),
  }));

  return { bets: formatted, count: formatted.length };
});

export const fetchLeaderboard = cache(async () => {
  const program = getProgram();
  const allReps = await (program.account as any).agentReputation.all();

  const formatted = allReps
    .map((r: any) => ({
      agent: r.account.agent.toBase58(),
      totalBets: r.account.totalBets,
      wins: r.account.wins,
      losses: r.account.losses,
      accuracy: r.account.accuracyBps / 100,
      totalWageredSol: r.account.totalWagered.toNumber() / 1e9,
      totalWonSol: r.account.totalWon.toNumber() / 1e9,
      totalLostSol: 0,
      marketsCreated: r.account.marketsCreated,
      lastActive: r.account.lastActive.toNumber(),
    }))
    .filter((r: any) => r.totalBets > 0)
    .sort((a: any, b: any) => {
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.totalBets - a.totalBets;
    });

  return { leaderboard: formatted, count: formatted.length };
});
