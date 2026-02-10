"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center">
      <div className="inline-flex flex-col items-center gap-4 bg-[#0f0f18] border border-rose-500/15 rounded-2xl p-8 max-w-md">
        <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">✕</div>
        <p className="text-rose-400 text-sm text-center">{error.message || "Something went wrong"}</p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
