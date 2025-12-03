import Link from "next/link";
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="text-xl font-semibold text-white transition hover:text-primary"
        >
          Quarry<span className="text-primary">.ai</span>
        </Link>
        <p className="hidden text-sm text-white/60 md:block">
          Schema-only agent marketplace
        </p>
        <Link
          href="/agent"
          className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-primary hover:text-primary"
        >
          Launch agent
        </Link>
      </div>
    </header>
  );
}

