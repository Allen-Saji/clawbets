export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeUntil(unix: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = unix - now;

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "open":
      return "text-green-400";
    case "closed":
      return "text-yellow-400";
    case "resolved":
      return "text-purple-400";
    case "cancelled":
      return "text-red-400";
    case "expired":
      return "text-zinc-400";
    default:
      return "text-zinc-400";
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "closed":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "resolved":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "cancelled":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
}
