"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Database, Home } from "lucide-react";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Marketplace", href: "/datasets", icon: Database },
  { label: "Agent", href: "/agent", icon: Bot },
];

export function DockNav() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 max-w-full px-4">
      <Dock className="pointer-events-auto items-end pb-3 rounded-full border border-white/[0.08] bg-black/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <DockItem
                className={cn(
                  "aspect-square rounded-full transition-all duration-300",
                  isActive
                    ? "border border-cyan-500/40 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                    : "border border-white/[0.06] bg-white/[0.04] hover:border-white/[0.12] hover:bg-white/[0.08]",
                )}
              >
                <DockLabel>{item.label}</DockLabel>
                <DockIcon>
                  <Icon
                    className={cn(
                      "h-full w-full transition-colors duration-300",
                      isActive ? "text-cyan-400" : "text-white/70",
                    )}
                  />
                </DockIcon>
              </DockItem>
            </Link>
          );
        })}
      </Dock>
    </div>
  );
}
