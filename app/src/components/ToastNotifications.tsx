"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ActivityItem } from "@/hooks/useActivityFeed";
import { truncateAddress } from "@/lib/utils";

interface Toast {
  id: string;
  item: ActivityItem;
  createdAt: number;
}

function borderColor(item: ActivityItem): string {
  if (item.type === "market_created") return "border-l-violet-500";
  return item.details.position === "YES" ? "border-l-emerald-500" : "border-l-rose-500";
}

function glowColor(item: ActivityItem): string {
  if (item.type === "market_created") return "shadow-violet-500/20";
  return item.details.position === "YES" ? "shadow-emerald-500/20" : "shadow-rose-500/20";
}

function toastText(item: ActivityItem): string {
  if (item.type === "market_created") {
    return `created market '${item.details.marketTitle}'`;
  }
  const sol = item.details.amountSol?.toFixed(3) ?? "?";
  const pos = item.details.position ?? "?";
  return `bet ${sol} SOL ${pos} on '${item.details.marketTitle}'`;
}

export default function ToastNotifications({ newItems }: { newItems: ActivityItem[] }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (newItems.length === 0) return;
    const incoming = newItems.slice(0, 3).map((item) => ({
      id: item.id,
      item,
      createdAt: Date.now(),
    }));
    setToasts((prev) => [...incoming, ...prev].slice(0, 3));
  }, [newItems]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Auto-dismiss after 5s
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => {
      const remaining = 5000 - (Date.now() - t.createdAt);
      if (remaining <= 0) {
        dismiss(t.id);
        return null;
      }
      return setTimeout(() => dismiss(t.id), remaining);
    });
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [toasts, dismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`pointer-events-auto relative rounded-xl border-l-[3px] ${borderColor(toast.item)} bg-[#0f0f18]/90 backdrop-blur-xl border border-[#1a1a2e] p-4 shadow-lg ${glowColor(toast.item)} animate-pulse-once`}
          >
            <button
              onClick={() => dismiss(toast.id)}
              className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-300 transition-colors text-xs leading-none p-1"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-violet-400/80 text-[11px]">
                {truncateAddress(toast.item.agent, 4)}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed pr-4">
              {toastText(toast.item)}
            </p>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                className={`h-full ${
                  toast.item.type === "market_created"
                    ? "bg-violet-500/50"
                    : toast.item.details.position === "YES"
                    ? "bg-emerald-500/50"
                    : "bg-rose-500/50"
                }`}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
