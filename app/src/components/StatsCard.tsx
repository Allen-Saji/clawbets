"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: ReactNode;
  accent?: string;
}

const accentMap: Record<string, { card: string; icon: string }> = {
  cyan: {
    card: "from-cyan-500/10 to-transparent border-cyan-500/10",
    icon: "text-cyan-400 bg-cyan-500/10",
  },
  violet: {
    card: "from-violet-500/10 to-transparent border-violet-500/10",
    icon: "text-violet-400 bg-violet-500/10",
  },
  pink: {
    card: "from-pink-500/10 to-transparent border-pink-500/10",
    icon: "text-pink-400 bg-pink-500/10",
  },
  gold: {
    card: "from-amber-500/10 to-transparent border-amber-500/10",
    icon: "text-amber-400 bg-amber-500/10",
  },
};

export default function StatsCard({ label, value, subValue, icon, accent = "cyan" }: StatsCardProps) {
  const colors = accentMap[accent] || accentMap.cyan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colors.card} p-5`}
    >
      <div className="flex items-center gap-2.5 mb-3">
        {icon && (
          <div className={`w-7 h-7 rounded-lg ${colors.icon} flex items-center justify-center`}>
            {icon}
          </div>
        )}
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {subValue && <p className="text-xs text-zinc-500 mt-1.5">{subValue}</p>}
    </motion.div>
  );
}
