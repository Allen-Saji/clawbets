"use client";

import { motion } from "framer-motion";

interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: string;
  accent?: string;
}

export default function StatsCard({ label, value, subValue, icon, accent = "cyan" }: StatsCardProps) {
  const accentColors: Record<string, string> = {
    cyan: "from-cyan-500/10 to-transparent border-cyan-500/10",
    violet: "from-violet-500/10 to-transparent border-violet-500/10",
    pink: "from-pink-500/10 to-transparent border-pink-500/10",
    gold: "from-amber-500/10 to-transparent border-amber-500/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accentColors[accent] || accentColors.cyan} p-5`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-base">{icon}</span>}
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {subValue && <p className="text-xs text-zinc-500 mt-1.5">{subValue}</p>}
    </motion.div>
  );
}
