"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ActivityItem } from "@/hooks/useActivityFeed";
import { truncateAddress } from "@/lib/utils";

function relativeTime(unix: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unix;
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function dotColor(item: ActivityItem): string {
  if (item.type === "market_created") return "bg-violet-400";
  return item.details.position === "YES" ? "bg-emerald-400" : "bg-rose-400";
}

function actionText(item: ActivityItem): string {
  if (item.type === "market_created") {
    return `created market '${item.details.marketTitle}'`;
  }
  const sol = item.details.amountSol?.toFixed(3) ?? "?";
  const pos = item.details.position ?? "?";
  return `bet ${sol} SOL ${pos} on '${item.details.marketTitle}'`;
}

export default function ActivityFeed({ activities, loading }: { activities: ActivityItem[]; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-[#1a1a2e] bg-[#0a0a14]/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#1a1a2e]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="text-xs font-semibold text-zinc-300 tracking-wide uppercase">Live Activity</span>
      </div>

      {/* Feed */}
      <div className="relative max-h-[400px] overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-600 text-xs">
            <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mr-2" />
            Loading activity...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-xs">No activity yet</div>
        ) : (
          <AnimatePresence initial={false}>
            {activities.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Link
                  href={item.details.marketId != null ? `/market/${item.details.marketId}` : "#"}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors border-b border-[#1a1a2e]/50 group"
                >
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotColor(item)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-violet-400/80 text-[11px]">
                        {truncateAddress(item.agent, 4)}
                      </span>
                      <span className="text-zinc-500">{actionText(item)}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600 tabular-nums mt-0.5 block">
                      {relativeTime(item.timestamp)}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Bottom fade */}
        <div className="sticky bottom-0 h-8 bg-gradient-to-t from-[#0a0a14] to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
