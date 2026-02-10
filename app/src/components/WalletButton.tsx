"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export default function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (publicKey) {
    const addr = publicKey.toBase58();
    const truncated = addr.slice(0, 4) + "..." + addr.slice(-4);
    return (
      <button
        onClick={() => disconnect()}
        className="px-3.5 py-2 rounded-lg text-sm font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
        title={addr}
      >
        {truncated}
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      disabled={connecting}
      className="px-3.5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition-all text-white"
    >
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
