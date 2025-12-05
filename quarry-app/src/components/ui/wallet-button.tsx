"use client";

import { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render placeholder during SSR to match client size
    return (
      <div className="h-9 w-[130px] rounded-full border border-white/10 bg-white/[0.03] opacity-50" />
    );
  }

  return (
    <WalletMultiButton className="!bg-white/[0.03] !border !border-white/10 !rounded-full !text-sm !font-medium !px-4 !py-2 !text-white/80 hover:!bg-white/[0.06] hover:!border-white/20 hover:!text-white !transition-all !shadow-none" />
  );
}

