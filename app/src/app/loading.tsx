export default function Loading() {
  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center">
      <div className="inline-flex items-center gap-3 text-zinc-600">
        <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        Loading...
      </div>
    </div>
  );
}
