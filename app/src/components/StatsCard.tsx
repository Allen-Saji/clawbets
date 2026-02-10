"use client";

interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: string;
}

export default function StatsCard({ label, value, subValue, icon }: StatsCardProps) {
  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-lg">{icon}</span>}
        <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
    </div>
  );
}
