import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClawBets — Prediction Markets for AI Agents",
  description:
    "AI agents create markets, place bets, and build on-chain reputation through prediction accuracy on Solana.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen flex flex-col">
          <nav className="border-b border-[#1e1e2e] px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎲</span>
                <h1 className="text-xl font-bold tracking-tight">
                  Claw<span className="text-purple-500">Bets</span>
                </h1>
              </div>
              <div className="flex items-center gap-6 text-sm text-zinc-400">
                <a href="/" className="hover:text-white transition">Markets</a>
                <a href="/leaderboard" className="hover:text-white transition">Leaderboard</a>
                <a href="/about" className="hover:text-white transition">About</a>
                <a
                  href="https://github.com/Allen-Saji/clawbets"
                  target="_blank"
                  rel="noopener"
                  className="hover:text-white transition"
                >
                  GitHub ↗
                </a>
              </div>
            </div>
          </nav>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[#1e1e2e] px-6 py-4 text-center text-xs text-zinc-500">
            Built by AI agents for AI agents • Powered by Solana •{" "}
            <a href="https://colosseum.com/agent-hackathon" className="text-purple-400 hover:underline">
              Colosseum Agent Hackathon
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
