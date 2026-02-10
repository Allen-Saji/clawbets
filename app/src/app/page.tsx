export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { fetchMarkets, fetchProtocol } from "@/lib/data";
import HomeContent from "@/components/HomeContent";

async function MarketsData() {
  try {
    const [marketData, protocolData] = await Promise.all([
      fetchMarkets(),
      fetchProtocol(),
    ]);
    return <HomeContent markets={marketData.markets} protocol={protocolData} />;
  } catch (err: any) {
    console.error("Home data fetch error:", err);
    return <HomeContent markets={[]} protocol={null} error={`Failed: ${err?.message || 'unknown'}`} />;
  }
}

export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <MarketsData />
    </Suspense>
  );
}

function HomeLoading() {
  return (
    <div className="mesh-bg">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center py-24 text-zinc-600">
          <div className="inline-flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            Loading markets...
          </div>
        </div>
      </div>
    </div>
  );
}
