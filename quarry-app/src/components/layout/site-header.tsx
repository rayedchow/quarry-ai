import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/#agent-flow", label: "Agent Flow" },
  { href: "/datasets", label: "Datasets" },
  { href: "/agent", label: "Multi-Agent" },
  { href: "/providers", label: "Providers" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="text-xl font-semibold text-white transition hover:text-primary"
        >
          Quarry<span className="text-primary">.ai</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "tracking-wide transition hover:text-white",
                item.href.startsWith("#") && "scroll-smooth",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-white" asChild>
            <Link href="/datasets">Browse datasets</Link>
          </Button>
          <Button
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-glow"
            asChild
          >
            <Link href="/agent">Connect wallet</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

