"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { WalletButton } from "@/components/ui/wallet-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-xl font-semibold tracking-wide text-white transition-colors hover:text-cyan-400"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          QUARRY
        </Link>

        <div className="flex items-center gap-3">
          <WalletButton />

        <Link
          href="/datasets/publish"
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-400"
        >
          <Plus className="h-4 w-4" />
          <span>Publish dataset</span>
        </Link>
        </div>
      </div>
    </header>
  );
}
