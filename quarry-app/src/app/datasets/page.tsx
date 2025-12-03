import { Search, Tag, Upload, Wand2, Database, Sparkles } from "lucide-react";
import { datasets } from "@/data/datasets";
import { DatasetCard } from "@/components/sections/dataset-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const allTags = Array.from(new Set(datasets.flatMap((dataset) => dataset.tags)));

export default function DatasetsPage() {
  return (
    <div className="space-y-12 py-8">
      {/* Hero Section */}
      <div className="glass-panel p-8 md:p-10 space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-cyan-400">Data Marketplace</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            Browse verified schemas.
            <br />
            <span className="text-gradient-accent">Zero data leaves a vault.</span>
          </h1>

          <p className="max-w-2xl text-white/60 leading-relaxed">
            Search by tag, provider, or column metadata. Attach any dataset to your
            agent without touching raw rows.
          </p>
        </div>

        {/* Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              type="search"
              placeholder="Search by dataset, provider, or column…"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-14 pr-6 py-4 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-white/60 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-400"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </button>
            ))}
            {allTags.length > 8 && (
              <span className="flex items-center rounded-full border border-dashed border-white/10 px-3.5 py-2 text-sm text-white/40">
                +{allTags.length - 8} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dataset Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <p className="section-label">Available datasets</p>
            <span className="stat-chip text-xs">
              <span className="text-white">{datasets.length}</span>
              <span className="text-white/40">total</span>
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {datasets.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="glass-panel p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10">
              <Sparkles className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Need to list a dataset?</h2>
              <p className="mt-1 text-sm text-white/50">
                Providers keep full control while exposing schema-only previews.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="btn-secondary">
              <Wand2 className="h-4 w-4" />
              Generate summary
            </Button>
            <Button className="btn-primary" asChild>
              <Link href="/providers">
                <Upload className="h-4 w-4" />
                Upload your dataset
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
