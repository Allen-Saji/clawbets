import { Suspense } from "react";
import { fetchMarket, fetchMarketBets } from "@/lib/data";
import MarketDetail from "@/components/MarketDetail";
import Link from "next/link";

async function MarketData({ id }: { id: number }) {
  try {
    const [market, betsData] = await Promise.all([
      fetchMarket(id),
      fetchMarketBets(id),
    ]);
    return <MarketDetail market={market} bets={betsData.bets} />;
  } catch {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p className="text-rose-400 mb-4">Market not found</p>
        <Link href="/" className="text-violet-400 hover:underline text-sm">← Back to markets</Link>
      </div>
    );
  }
}

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const marketId = Number(id);

  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-6 py-24 text-center text-zinc-600">
        <div className="inline-flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          Loading market...
        </div>
      </div>
    }>
      <MarketData id={marketId} />
    </Suspense>
  );
}
