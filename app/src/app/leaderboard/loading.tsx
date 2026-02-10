export default function Loading() {
  return (
    <div className="mesh-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center py-24 text-zinc-600">
          <div className="inline-flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            Loading leaderboard...
          </div>
        </div>
      </div>
    </div>
  );
}
