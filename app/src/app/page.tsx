import { Suspense } from "react";
import { getMarkets, getProtocol } from "@/lib/api";
import HomeContent from "@/components/HomeContent";

async function MarketsData() {
  try {
    const [marketData, protocolData] = await Promise.all([
      getMarkets(),
      getProtocol(),
    ]);
    return <HomeContent markets={marketData.markets} protocol={protocolData} />;
  } catch {
    return <HomeContent markets={[]} protocol={null} error="Failed to connect to ClawBets API" />;
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
