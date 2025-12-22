import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturedDatasets } from "@/components/sections/featured-datasets";

export default function Home() {
  return (
    <div className="flex flex-col gap-20 pb-32 pt-4">
      {/* Hero Section */}
      <section className="glass-panel relative overflow-hidden px-8 py-24 md:px-12 md:py-32">
        {/* Ambient Effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(56,189,248,0.1),transparent)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center space-y-8">
          <h1 className="text-5xl font-semibold leading-tight tracking-tight text-white sm:text-6xl md:text-7xl">
            Schema-only data
            <br />
            <span className="text-gradient-accent">marketplace.</span>
          </h1>
          
          <p className="text-xl text-white/60 leading-relaxed max-w-2xl mx-auto">
            Browse schemas freely. Purchase data precisely.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button className="btn-primary h-12 px-8" asChild>
              <Link href="/datasets">
                Explore datasets
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button className="btn-secondary h-12 px-8" asChild>
              <Link href="/agent">Launch agent</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Datasets */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Featured datasets
          </h2>
          <p className="text-white/50">
            Start exploring live schemas.
          </p>
        </div>

        <FeaturedDatasets />
      </section>
    </div>
  );
}
