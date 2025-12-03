"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Database,
  Download,
  Home,
  UsersRound,
  Wallet2,
} from "lucide-react";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Landing", href: "/", icon: Home },
  { label: "Marketplace", href: "/datasets", icon: Database },
  { label: "Agent", href: "/agent", icon: Bot },
  { label: "Providers", href: "/providers", icon: UsersRound },
  { label: "Checkout", href: "/checkout", icon: Wallet2 },
  { label: "Downloads", href: "/download", icon: Download },
];

export function DockNav() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 max-w-full px-4">
      <Dock className="pointer-events-auto items-end pb-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <DockItem
                className={cn(
                  "aspect-square rounded-full border border-white/10 bg-white/40 text-neutral-600 backdrop-blur dark:bg-neutral-800",
                  isActive && "border-primary/60 bg-primary/30",
                )}
              >
                <DockLabel>{item.label}</DockLabel>
                <DockIcon>
                  <Icon className="h-full w-full text-neutral-900 dark:text-white" />
                </DockIcon>
              </DockItem>
            </Link>
          );
        })}
      </Dock>
    </div>
  );
}

