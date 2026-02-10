export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-center text-zinc-600">
      <div className="inline-flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        Loading market...
      </div>
    </div>
  );
}
